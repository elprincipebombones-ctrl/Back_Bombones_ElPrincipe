const { Op, QueryTypes } = require('sequelize');
const {
  sequelize,
  SolicitudMovimientoOt,
  OrdenProduccion,
  Producto,
  UnidadMedida,
  Bodega,
  Usuario,
  MovimientoInventario,
  MermaProduccion,
} = require('../../models');
const { resolverBodegaPep } = require('./bodega-pep.service');
const { crearMovimiento, saldosPep } = require('./produccion-parcial.service');

const error = (message, status = 422, details = null) =>
  Object.assign(new Error(message), { status, details });
const redondear = (cantidad) => Number(Number(cantidad).toFixed(6));
const clave = (lote) =>
  JSON.stringify([
    lote.productoId,
    lote.unidadMedidaId,
    lote.lote || null,
    lote.fechaVencimiento || null,
  ]);
const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');
const consulta = (sql, replacements, transaction) =>
  sequelize.query(sql, { replacements, type: QueryTypes.SELECT, transaction });

const incluirSolicitud = [
  { model: OrdenProduccion, as: 'orden', attributes: ['id', 'numero', 'estado'] },
  { model: Producto, as: 'producto', attributes: ['id', 'codigo', 'nombre'] },
  { model: UnidadMedida, as: 'unidadMedida', attributes: ['id', 'nombre', 'simbolo'] },
  { model: Bodega, as: 'bodegaOrigen', attributes: ['id', 'codigo', 'nombre'] },
  { model: Bodega, as: 'bodegaDestino', attributes: ['id', 'codigo', 'nombre'] },
  { model: Usuario, as: 'solicitante', attributes: ['id', 'nombre'] },
  { model: Usuario, as: 'resolutor', attributes: ['id', 'nombre'] },
  { model: MovimientoInventario, as: 'movimientoSalida', attributes: ['id', 'numeroDocumento'] },
  { model: MovimientoInventario, as: 'movimientoEntrada', attributes: ['id', 'numeroDocumento'] },
];

const obtenerOrden = async (id, transaction, bloquear = false) => {
  const orden = await OrdenProduccion.findByPk(id, {
    transaction,
    ...(bloquear ? { lock: transaction.LOCK.UPDATE } : {}),
  });
  if (!orden) throw error('La OT no existe', 404);
  return orden;
};

const validarOrdenOperativa = (orden) => {
  if (!['LISTA_PRODUCCION', 'EN_PRODUCCION'].includes(orden.estado) || !orden.movimientoPepId) {
    throw error('La OT debe tener MP liberada a PEP y estar lista o en producción', 409);
  }
};

const productosPermitidos = (orden, transaction) =>
  consulta(
    `
  SELECT DISTINCT p.id
  FROM productos p
  WHERE p.estado = true AND p.tipo_producto <> 'PT' AND (
    p.id IN (SELECT producto_id FROM detalle_movimiento WHERE movimiento_inventario_id = :salida)
    OR EXISTS (
      SELECT 1 FROM ordenes_produccion_detalle od
      JOIN formula_producto f ON f.producto_terminado_id = od.producto_terminado_id AND f.activo = true
      JOIN formula_componentes c ON c.formula_producto_id = f.id
      WHERE od.orden_produccion_id = :ordenId AND
        (c.producto_id = p.id OR c.familia_mp_carnica_id = p.familia_mp_carnica_id)
    )
  )`,
    { salida: orden.movimientoSalidaId, ordenId: orden.id },
    transaction,
  );

// Incluye ajustes y traslados existentes y conserva seis decimales de inventario.
const stockLotes = async (productoIds, transaction) => {
  if (!productoIds.length) return [];
  return consulta(
    `SELECT d.producto_id AS "productoId", p.nombre AS producto, p.codigo AS "productoCodigo",
    d.unidad_medida_id AS "unidadMedidaId", u.simbolo AS unidad,
    COALESCE(d.lote, d.lote_proveedor) AS lote, d.fecha_vencimiento::text AS "fechaVencimiento",
    m.bodega_id AS "bodegaId", b.nombre AS bodega, b.codigo AS "bodegaCodigo",
    SUM(d.cantidad * CASE
      WHEN m.tipo_documento IN ('EN', 'AJN', 'TRN') THEN 1
      WHEN m.tipo_documento IN ('SA', 'AJS', 'TRS') THEN -1
      WHEN d.sentido = 'ENTRADA' THEN 1 WHEN d.sentido = 'SALIDA' THEN -1 ELSE 0 END) AS saldo
    FROM detalle_movimiento d
    JOIN movimientos_inventario m ON m.id = d.movimiento_inventario_id
    JOIN productos p ON p.id = d.producto_id
    JOIN unidades_medida u ON u.id = d.unidad_medida_id
    JOIN bodegas b ON b.id = m.bodega_id
    WHERE m.estado = 'APLICADO' AND b.estado = true AND d.producto_id IN (:productoIds)
      AND m.fecha <= clock_timestamp()
    GROUP BY d.producto_id, p.nombre, p.codigo, d.unidad_medida_id, u.simbolo,
      COALESCE(d.lote, d.lote_proveedor), d.fecha_vencimiento, m.bodega_id, b.nombre, b.codigo
    ORDER BY d.fecha_vencimiento ASC NULLS LAST, COALESCE(d.lote, d.lote_proveedor), m.bodega_id`,
    { productoIds },
    transaction,
  );
};

const lotesAdicionales = async (orden, pep, transaction) => {
  const ids = (await productosPermitidos(orden, transaction)).map((p) => p.id);
  return (await stockLotes(ids, transaction))
    .filter((lote) => lote.bodegaId !== pep.id && Number(lote.saldo) > 0)
    .map((lote) => ({
      ...lote,
      disponible: redondear(lote.saldo),
      bodegaOrigenId: lote.bodegaId,
      bodegaDestinoId: pep.id,
      bodegaOrigen: lote.bodega,
      bodegaDestino: pep.nombre,
    }));
};

const lotesDevolucion = async (orden, pep, transaction) => {
  const lotes = await saldosPep(orden, transaction);
  if (!lotes.length) return [];
  const fisicos = await stockLotes([...new Set(lotes.map((lote) => lote.productoId))], transaction);
  const fisicosPep = new Map(
    fisicos.filter((lote) => lote.bodegaId === pep.id).map((lote) => [clave(lote), lote]),
  );
  const mermas = await MermaProduccion.findAll({
    where: { ordenProduccionId: orden.id, tipoMerma: 'MP' },
    transaction,
  });
  // Misma imputación de mermas por FEFO que el consumo parcial actual.
  for (const merma of mermas) {
    let pendiente = Number(merma.cantidad);
    for (const lote of lotes.filter((item) => item.productoId === merma.productoId)) {
      const descontar = Math.min(Math.max(0, Number(lote.saldo)), pendiente);
      lote.saldo = redondear(Number(lote.saldo) - descontar);
      pendiente = redondear(pendiente - descontar);
    }
  }
  const origenes = await consulta(
    `WITH ingresos AS (
    SELECT d.producto_id, d.unidad_medida_id, COALESCE(d.lote, d.lote_proveedor) AS lote,
      d.fecha_vencimiento, m.bodega_id AS bodega_id, d.cantidad, m.fecha
    FROM detalle_movimiento d JOIN movimientos_inventario m ON m.id = d.movimiento_inventario_id
    WHERE m.id = :salida AND m.estado = 'APLICADO'
    UNION ALL
    SELECT producto_id, unidad_medida_id, lote, fecha_vencimiento, bodega_origen_id, cantidad, fecha_aprobacion
    FROM solicitudes_movimiento_ot WHERE orden_produccion_id = :ordenId AND tipo = 'ADICIONAL' AND estado = 'ATENDIDA'
  ) SELECT i.producto_id AS "productoId", i.unidad_medida_id AS "unidadMedidaId", i.lote,
    i.fecha_vencimiento::text AS "fechaVencimiento", i.bodega_id AS "bodegaDestinoId",
    b.nombre AS "bodegaDestino", b.estado AS activa, SUM(i.cantidad) AS enviado, MIN(i.fecha) AS fecha
    FROM ingresos i JOIN bodegas b ON b.id = i.bodega_id
    GROUP BY i.producto_id, i.unidad_medida_id, i.lote, i.fecha_vencimiento, i.bodega_id, b.nombre, b.estado
    ORDER BY MIN(i.fecha), i.bodega_id`,
    { salida: orden.movimientoSalidaId, ordenId: orden.id },
    transaction,
  );
  const devoluciones = await SolicitudMovimientoOt.findAll({
    where: { ordenProduccionId: orden.id, tipo: 'DEVOLUCION', estado: 'ATENDIDA' },
    transaction,
  });
  const opciones = [];
  for (const lote of lotes) {
    const fisico = fisicosPep.get(clave(lote));
    const disponible = Math.max(0, Math.min(Number(lote.saldo), Number(fisico?.saldo || 0)));
    const fuentes = origenes
      .filter((origen) => clave(origen) === clave(lote))
      .map((origen) => ({
        ...origen,
        remanente: Math.max(
          0,
          redondear(
            Number(origen.enviado) -
              devoluciones
                .filter(
                  (d) => clave(d) === clave(lote) && d.bodegaDestinoId === origen.bodegaDestinoId,
                )
                .reduce((total, d) => total + Number(d.cantidad), 0),
          ),
        ),
      }));
    // Si un mismo lote ingresó por varias bodegas, atribuir el consumo a los ingresos más antiguos.
    let usado = Math.max(
      0,
      redondear(fuentes.reduce((total, fuente) => total + fuente.remanente, 0) - disponible),
    );
    for (const fuente of fuentes) {
      const descontar = Math.min(fuente.remanente, usado);
      const saldo = redondear(fuente.remanente - descontar);
      usado = redondear(usado - descontar);
      if (saldo > 0 && fuente.activa)
        opciones.push({
          ...lote,
          productoCodigo: fisico?.productoCodigo,
          unidad: fisico?.unidad,
          disponible: saldo,
          bodegaOrigenId: pep.id,
          bodegaOrigen: pep.nombre,
          bodegaDestinoId: fuente.bodegaDestinoId,
          bodegaDestino: fuente.bodegaDestino,
        });
    }
  }
  return opciones;
};

const catalogos = async (ordenId, tipo, transaction) => {
  if (!['ADICIONAL', 'DEVOLUCION'].includes(tipo)) throw error('El tipo de solicitud no es válido');
  const orden = await obtenerOrden(ordenId, transaction);
  validarOrdenOperativa(orden);
  const pep = await resolverBodegaPep(transaction);
  const lotes =
    tipo === 'ADICIONAL'
      ? await lotesAdicionales(orden, pep, transaction)
      : await lotesDevolucion(orden, pep, transaction);
  return { lotes, bodegaPep: { id: pep.id, nombre: pep.nombre } };
};

const validarDatos = async (orden, datos, transaction) => {
  validarOrdenOperativa(orden);
  if (!['ADICIONAL', 'DEVOLUCION'].includes(datos.tipo))
    throw error('El tipo de solicitud no es válido');
  if (
    !['number', 'string'].includes(typeof datos.cantidad) ||
    !/^\d{1,12}(\.\d{1,6})?$/.test(String(datos.cantidad)) ||
    !(Number(datos.cantidad) > 0)
  ) {
    throw error('La cantidad debe ser mayor que cero, con máximo seis decimales');
  }
  const motivo = texto(datos.motivo);
  if (!motivo || motivo.length > 2000)
    throw error('El motivo es obligatorio y admite máximo 2000 caracteres');
  const pep = await resolverBodegaPep(transaction);
  if (
    (datos.tipo === 'ADICIONAL' && datos.bodegaDestinoId !== pep.id) ||
    (datos.tipo === 'DEVOLUCION' && datos.bodegaOrigenId !== pep.id)
  )
    throw error('Las bodegas enviadas no corresponden al flujo PEP');
  const opciones =
    datos.tipo === 'ADICIONAL'
      ? await lotesAdicionales(orden, pep, transaction)
      : await lotesDevolucion(orden, pep, transaction);
  const seleccion = opciones.find(
    (lote) =>
      clave(lote) === clave(datos) &&
      lote.bodegaOrigenId === datos.bodegaOrigenId &&
      lote.bodegaDestinoId === datos.bodegaDestinoId,
  );
  if (!seleccion || Number(datos.cantidad) > seleccion.disponible) {
    throw error(
      'El producto, lote o bodegas no son válidos para esta OT, o el saldo disponible ya no alcanza. Actualice los lotes.',
      409,
      {
        productoId: datos.productoId,
        lote: datos.lote || null,
        requerido: Number(datos.cantidad),
        disponible: seleccion?.disponible || 0,
      },
    );
  }
  return {
    tipo: datos.tipo,
    productoId: seleccion.productoId,
    lote: seleccion.lote || null,
    fechaVencimiento: seleccion.fechaVencimiento || null,
    cantidad: Number(datos.cantidad),
    unidadMedidaId: seleccion.unidadMedidaId,
    bodegaOrigenId: seleccion.bodegaOrigenId,
    bodegaDestinoId: seleccion.bodegaDestinoId,
    motivo,
  };
};

const crear = async (ordenId, datos, usuarioId, transaction) => {
  const orden = await obtenerOrden(ordenId, transaction, true);
  const valores = await validarDatos(orden, datos, transaction);
  return SolicitudMovimientoOt.create(
    {
      ...valores,
      ordenProduccionId: orden.id,
      estado: 'PENDIENTE',
      usuarioSolicitaId: usuarioId,
      fechaSolicitud: new Date(),
    },
    { transaction },
  );
};

const obtener = async (id, transaction) => {
  const solicitud = await SolicitudMovimientoOt.findByPk(id, {
    include: incluirSolicitud,
    transaction,
  });
  if (!solicitud) throw error('La solicitud no existe', 404);
  return solicitud;
};

const listar = async (filtros, transaction) => {
  const where = {};
  if (filtros.ordenId) where.ordenProduccionId = filtros.ordenId;
  if (filtros.tipo) where.tipo = filtros.tipo;
  if (filtros.estado) where.estado = filtros.estado;
  if (texto(filtros.ot)) where['$orden.numero$'] = { [Op.iLike]: `%${texto(filtros.ot)}%` };
  const solicitudes = await SolicitudMovimientoOt.findAll({
    where,
    include: incluirSolicitud,
    order: [
      ['fechaSolicitud', 'DESC'],
      ['id', 'DESC'],
    ],
    transaction,
  });
  const pendientes = await SolicitudMovimientoOt.count({
    where: {
      estado: 'PENDIENTE',
      ...(filtros.ordenId ? { ordenProduccionId: filtros.ordenId } : {}),
    },
    transaction,
  });
  return { solicitudes, pendientes };
};

const resolver = async (id, accion, observacion, usuarioId, transaction) => {
  if (!['EJECUTAR', 'RECHAZAR'].includes(accion)) throw error('La acción no es válida');
  const referencia = await SolicitudMovimientoOt.findByPk(id, { transaction });
  if (!referencia) throw error('La solicitud no existe', 404);
  // Siempre OT antes de solicitud: mismo orden de bloqueo que parciales y cierre.
  const orden = await obtenerOrden(referencia.ordenProduccionId, transaction, true);
  const solicitud = await SolicitudMovimientoOt.findByPk(id, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!['PENDIENTE', 'APROBADA'].includes(solicitud.estado))
    throw error('La solicitud ya fue resuelta; no puede ejecutarse nuevamente', 409);
  const nota = texto(observacion);
  if (nota.length > 2000) throw error('La observación admite máximo 2000 caracteres');
  const resolucion = {
    usuarioApruebaId: usuarioId,
    fechaAprobacion: new Date(),
    observacionResolucion: nota || null,
  };
  if (accion === 'RECHAZAR') {
    if (!nota) throw error('La observación de rechazo es obligatoria');
    await solicitud.update({ ...resolucion, estado: 'RECHAZADA' }, { transaction });
    return solicitud;
  }
  // Coordinar también con la liberación inicial, que usa este bloqueo por lote.
  const claves = [solicitud.bodegaOrigenId, solicitud.bodegaDestinoId]
    .map((bodegaId) =>
      [solicitud.productoId, bodegaId, solicitud.lote || '', solicitud.fechaVencimiento || ''].join(
        '|',
      ),
    )
    .sort();
  for (const claveStock of claves) {
    await sequelize.query('SELECT pg_advisory_xact_lock(hashtextextended(:claveStock, 0))', {
      replacements: { claveStock },
      transaction,
    });
  }
  const bodegas = await Bodega.findAll({
    where: { id: [solicitud.bodegaOrigenId, solicitud.bodegaDestinoId] },
    order: [['id', 'ASC']],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (bodegas.length !== 2 || bodegas.some((bodega) => !bodega.estado))
    throw error('Las bodegas deben existir y estar activas', 409);
  const datos = await validarDatos(orden, solicitud.toJSON(), transaction);
  const comun = {
    origen: solicitud.tipo === 'ADICIONAL' ? 'OT_MP_ADICIONAL' : 'OT_MP_DEVOLUCION',
    origenId: solicitud.id,
    usuarioId,
    transaction,
    detalles: [
      {
        productoId: datos.productoId,
        unidadMedidaId: datos.unidadMedidaId,
        lote: datos.lote,
        fechaVencimiento: datos.fechaVencimiento,
        cantidad: datos.cantidad,
      },
    ],
  };
  const salida = await crearMovimiento({ ...comun, tipo: 'SA', bodegaId: datos.bodegaOrigenId });
  const entrada = await crearMovimiento({ ...comun, tipo: 'EN', bodegaId: datos.bodegaDestinoId });
  await solicitud.update(
    {
      ...resolucion,
      estado: 'ATENDIDA',
      movimientoSalidaId: salida.id,
      movimientoEntradaId: entrada.id,
    },
    { transaction },
  );
  return solicitud;
};

module.exports = { catalogos, crear, obtener, listar, resolver, lotesDevolucion };
