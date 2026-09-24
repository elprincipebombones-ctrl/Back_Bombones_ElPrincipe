const { Op, QueryTypes } = require('sequelize');

const sequelize = require('../../database/database');
const {
  CondicionTermica,
  FamiliaMpCarnica,
  FormulaComponente,
  FormulaProducto,
  DetalleMovimiento,
  MovimientoInventario,
  OrdenProduccion,
  OrdenProduccionDetalle,
  OrdenProduccionSimulacion,
  OrdenProduccionSimulacionDetalle,
  OrdenProduccionSimulacionLote,
  Producto,
  UnidadMedida,
} = require('../../models');
const { normalizarCantidad } = require('./conversion-unidad.service');

class OrdenProduccionError extends Error {
  constructor(message, status = 422) {
    super(message);
    this.status = status;
  }
}

const redondear = (valor) => Number(Number(valor).toFixed(6));

const siguienteNumeroOrden = async (transaction) => {
  const [resultado] = await sequelize.query(
    `SELECT nextval('ordenes_produccion_numero_seq')::bigint AS consecutivo`,
    { transaction, type: QueryTypes.SELECT },
  );
  return `OP-${String(resultado.consecutivo).padStart(6, '0')}`;
};

const siguienteNumeroSalida = async (transaction) => {
  const [resultado] = await sequelize.query(
    `SELECT nextval('movimientos_sa_numero_seq')::bigint AS consecutivo`,
    { transaction, type: QueryTypes.SELECT },
  );
  return `SA-${String(resultado.consecutivo).padStart(6, '0')}`;
};

const validarDetallesOrden = async (detalles, transaction) => {
  if (!Array.isArray(detalles) || detalles.length === 0) {
    throw new OrdenProduccionError('La orden debe incluir al menos un producto terminado');
  }
  const ids = detalles.map((detalle) => detalle.productoTerminadoId);
  if (new Set(ids).size !== ids.length) {
    throw new OrdenProduccionError('No se puede repetir un producto terminado en la orden', 409);
  }
  if (detalles.some((detalle) => !(Number(detalle.cantidad) > 0))) {
    throw new OrdenProduccionError('Todas las cantidades deben ser mayores que cero');
  }
  const productos = await Producto.findAll({
    where: { id: { [Op.in]: ids }, tipoProducto: 'PT', estado: true },
    transaction,
  });
  if (productos.length !== ids.length) {
    throw new OrdenProduccionError('Todos los productos de la orden deben ser PT activos');
  }
};

const reemplazarDetallesOrden = async (ordenId, detalles, transaction) => {
  await validarDetallesOrden(detalles, transaction);
  await OrdenProduccionDetalle.destroy({ where: { ordenProduccionId: ordenId }, transaction });
  await OrdenProduccionDetalle.bulkCreate(
    detalles.map((detalle) => ({
      ordenProduccionId: ordenId,
      productoTerminadoId: detalle.productoTerminadoId,
      cantidad: detalle.cantidad,
    })),
    { transaction },
  );
};

const obtenerSaldosLotes = async (productoIds, transaction) => {
  if (!productoIds.length) return [];

  // AJ no registra si es entrada o salida y TR no identifica bodega origen/destino.
  // Se excluyen hasta que el modelo de inventario defina esos efectos sin ambigüedad.
  return sequelize.query(
    `SELECT
       d.producto_id AS "productoId",
       p.codigo AS "productoCodigo",
       p.nombre AS "productoNombre",
       COALESCE(d.lote, d.lote_proveedor) AS lote,
       m.bodega_id AS "bodegaId",
       b.codigo AS "bodegaCodigo",
       b.nombre AS "bodegaNombre",
       d.fecha_vencimiento AS "fechaVencimiento",
       SUM(CASE
         WHEN m.tipo_documento = 'EN' THEN d.cantidad
         WHEN m.tipo_documento = 'SA' THEN -d.cantidad
         ELSE 0
       END)::numeric AS saldo
     FROM detalle_movimiento d
     INNER JOIN movimientos_inventario m ON m.id = d.movimiento_inventario_id
     INNER JOIN productos p ON p.id = d.producto_id
     INNER JOIN bodegas b ON b.id = m.bodega_id
     WHERE d.producto_id IN (:productoIds)
       AND m.estado = 'APLICADO'
       AND m.tipo_documento IN ('EN', 'SA')
     GROUP BY d.producto_id, p.codigo, p.nombre, COALESCE(d.lote, d.lote_proveedor),
              m.bodega_id, b.codigo, b.nombre, d.fecha_vencimiento
     HAVING SUM(CASE
       WHEN m.tipo_documento = 'EN' THEN d.cantidad
       WHEN m.tipo_documento = 'SA' THEN -d.cantidad
       ELSE 0
     END) > 0
     ORDER BY d.fecha_vencimiento ASC NULLS LAST, COALESCE(d.lote, d.lote_proveedor) ASC`,
    {
      replacements: { productoIds },
      transaction,
      type: QueryTypes.SELECT,
    },
  );
};

const prioridadTermica = (producto) => {
  const codigo = producto.condicionTermica?.codigo;
  if (codigo === 'REFRIGERADO') return 0;
  if (codigo === 'CONGELADO') return 1;
  return 2;
};

const fechaOrdenable = (fecha) => (fecha ? new Date(`${fecha}T00:00:00`).getTime() : Infinity);

const ordenarFefo = (lotes, productosPorId = new Map()) =>
  [...lotes].sort((a, b) => {
    const termicaA = prioridadTermica(productosPorId.get(a.productoId) || {});
    const termicaB = prioridadTermica(productosPorId.get(b.productoId) || {});
    if (termicaA !== termicaB) return termicaA - termicaB;
    const fecha = fechaOrdenable(a.fechaVencimiento) - fechaOrdenable(b.fechaVencimiento);
    if (fecha !== 0) return fecha;
    return String(a.lote || '').localeCompare(String(b.lote || ''));
  });

const asignarLotes = (lotes, cantidadRequerida) => {
  let pendiente = Number(cantidadRequerida);
  const asignaciones = [];
  for (const lote of lotes) {
    if (pendiente <= 0) break;
    const saldo = Number(lote.saldo);
    const cantidad = redondear(Math.min(saldo, pendiente));
    if (!(cantidad > 0)) continue;
    asignaciones.push({
      productoId: lote.productoId,
      lote: lote.lote || null,
      bodegaId: lote.bodegaId,
      fechaVencimiento: lote.fechaVencimiento || null,
      saldoDisponible: saldo,
      cantidad,
      esSugerenciaFefo: true,
      seleccionManual: false,
    });
    pendiente = redondear(pendiente - cantidad);
  }
  return { asignaciones, faltante: Math.max(0, pendiente) };
};

const cargarComponentesConsolidados = async (ordenId, transaction) => {
  const detallesOrden = await OrdenProduccionDetalle.findAll({
    where: { ordenProduccionId: ordenId },
    transaction,
  });
  if (!detallesOrden.length) {
    throw new OrdenProduccionError('La orden no tiene productos terminados');
  }

  const ptIds = detallesOrden.map((detalle) => detalle.productoTerminadoId);
  const formulas = await FormulaProducto.findAll({
    where: { productoTerminadoId: { [Op.in]: ptIds }, activo: true },
    include: [
      {
        model: FormulaComponente,
        as: 'componentes',
        include: [
          {
            model: Producto,
            as: 'producto',
            include: [{ model: UnidadMedida, as: 'unidadMedida' }],
          },
          { model: FamiliaMpCarnica, as: 'familiaMpCarnica' },
        ],
      },
    ],
    transaction,
  });
  const formulasPorPt = new Map(formulas.map((formula) => [formula.productoTerminadoId, formula]));
  const faltantes = detallesOrden.filter(
    (detalle) => !formulasPorPt.has(detalle.productoTerminadoId),
  );
  if (faltantes.length) {
    const productos = await Producto.findAll({
      where: { id: { [Op.in]: faltantes.map((detalle) => detalle.productoTerminadoId) } },
      transaction,
    });
    throw new OrdenProduccionError(
      `No se puede simular porque falta la fórmula de: ${productos.map((p) => p.nombre).join(', ')}`,
    );
  }

  const familiaIds = [
    ...new Set(
      formulas.flatMap((formula) =>
        formula.componentes.map((componente) => componente.familiaMpCarnicaId).filter(Boolean),
      ),
    ),
  ];
  const productosFamilia = familiaIds.length
    ? await Producto.findAll({
        where: {
          familiaMpCarnicaId: { [Op.in]: familiaIds },
          tipoProducto: 'MP',
          estado: true,
        },
        include: [
          { model: UnidadMedida, as: 'unidadMedida' },
          { model: CondicionTermica, as: 'condicionTermica' },
        ],
        transaction,
      })
    : [];
  const miembrosPorFamilia = new Map();
  productosFamilia.forEach((producto) => {
    const actuales = miembrosPorFamilia.get(producto.familiaMpCarnicaId) || [];
    actuales.push(producto);
    miembrosPorFamilia.set(producto.familiaMpCarnicaId, actuales);
  });

  const consolidados = new Map();
  for (const detalleOrden of detallesOrden) {
    const formula = formulasPorPt.get(detalleOrden.productoTerminadoId);
    for (const componente of formula.componentes) {
      let unidadBaseId;
      let miembrosFamilia = [];
      if (componente.productoId) {
        unidadBaseId = componente.producto.unidadMedidaId;
      } else {
        miembrosFamilia = miembrosPorFamilia.get(componente.familiaMpCarnicaId) || [];
        const unidades = new Set(miembrosFamilia.map((producto) => producto.unidadMedidaId));
        if (!miembrosFamilia.length || unidades.size !== 1) {
          throw new OrdenProduccionError(
            `La familia ${componente.familiaMpCarnica?.nombre || ''} no tiene una unidad base común`,
          );
        }
        [unidadBaseId] = unidades;
      }

      const conversion = await normalizarCantidad({
        cantidad: componente.cantidad,
        unidadOrigenId: componente.unidadMedidaId,
        unidadBaseId,
        transaction,
      });
      const cantidad = redondear(conversion.cantidadNormalizada * Number(detalleOrden.cantidad));
      const clave = componente.productoId
        ? `PRODUCTO:${componente.productoId}`
        : `FAMILIA:${componente.familiaMpCarnicaId}`;
      const actual = consolidados.get(clave);
      if (actual && actual.unidadMedidaId !== unidadBaseId) {
        throw new OrdenProduccionError('Un componente consolidado tiene unidades base diferentes');
      }
      consolidados.set(clave, {
        productoId: componente.productoId || null,
        familiaMpCarnicaId: componente.familiaMpCarnicaId || null,
        unidadMedidaId: unidadBaseId,
        cantidadRequerida: redondear((actual?.cantidadRequerida || 0) + cantidad),
        miembrosFamilia,
      });
    }
  }
  return [...consolidados.values()];
};

const simularOrden = async (orden, transaction) => {
  const componentes = await cargarComponentesConsolidados(orden.id, transaction);
  const productosIds = [
    ...new Set(
      componentes.flatMap((componente) =>
        componente.productoId
          ? [componente.productoId]
          : componente.miembrosFamilia.map((producto) => producto.id),
      ),
    ),
  ];
  const saldos = await obtenerSaldosLotes(productosIds, transaction);

  await OrdenProduccionSimulacion.destroy({
    where: { ordenProduccionId: orden.id },
    transaction,
  });
  const simulacion = await OrdenProduccionSimulacion.create(
    { ordenProduccionId: orden.id, fechaSimulacion: new Date() },
    { transaction },
  );

  for (const componente of componentes) {
    const idsPermitidos = componente.productoId
      ? [componente.productoId]
      : componente.miembrosFamilia.map((producto) => producto.id);
    const productosPorId = new Map(
      componente.miembrosFamilia.map((producto) => [producto.id, producto]),
    );
    const lotes = ordenarFefo(
      saldos.filter((saldo) => idsPermitidos.includes(saldo.productoId)),
      productosPorId,
    );
    const cantidadDisponible = redondear(
      lotes.reduce((total, lote) => total + Number(lote.saldo), 0),
    );
    const { asignaciones, faltante } = asignarLotes(lotes, componente.cantidadRequerida);
    const advertencias = [];
    if (asignaciones.length > 1) {
      advertencias.push('La cantidad requerida se completa utilizando varios lotes.');
    }
    if (componente.familiaMpCarnicaId) {
      const usaCongelado = asignaciones.some(
        (asignacion) =>
          productosPorId.get(asignacion.productoId)?.condicionTermica?.codigo === 'CONGELADO',
      );
      if (usaCongelado) {
        advertencias.push(
          'El stock refrigerado no es suficiente. La simulación requiere completar con producto congelado.',
        );
      }
    }
    const estado = faltante > 0 ? 'CRITICA' : advertencias.length ? 'ADVERTENCIA' : 'OK';
    const detalle = await OrdenProduccionSimulacionDetalle.create(
      {
        simulacionId: simulacion.id,
        productoId: componente.productoId,
        familiaMpCarnicaId: componente.familiaMpCarnicaId,
        cantidadRequerida: componente.cantidadRequerida,
        cantidadDisponible,
        cantidadFaltante: faltante,
        unidadMedidaId: componente.unidadMedidaId,
        estado,
        advertencias,
      },
      { transaction },
    );
    if (asignaciones.length) {
      await OrdenProduccionSimulacionLote.bulkCreate(
        asignaciones.map((asignacion) => ({
          ...asignacion,
          detalleSimulacionId: detalle.id,
        })),
        { transaction },
      );
    }
  }
  await orden.update({ estado: 'SIMULADA' }, { transaction });
  return simulacion;
};

const lotesDisponibles = async (productoId, transaction) => {
  const lotes = await obtenerSaldosLotes([productoId], transaction);
  return ordenarFefo(lotes);
};

const cambiarLoteSimulacion = async ({ ordenId, loteSimulacionId, seleccion, transaction }) => {
  const loteActual = await OrdenProduccionSimulacionLote.findByPk(loteSimulacionId, {
    include: [
      {
        model: OrdenProduccionSimulacionDetalle,
        as: 'detalle',
        include: [{ model: OrdenProduccionSimulacion, as: 'simulacion' }],
      },
    ],
    transaction,
  });
  if (!loteActual) throw new OrdenProduccionError('La asignación de lote no existe', 404);
  if (loteActual.detalle.simulacion.ordenProduccionId !== ordenId) {
    throw new OrdenProduccionError('La asignación no pertenece a esta orden', 404);
  }
  const orden = await OrdenProduccion.findByPk(ordenId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!orden || orden.estado !== 'SIMULADA') {
    throw new OrdenProduccionError(
      'Los lotes solo pueden cambiarse mientras la orden está simulada',
      409,
    );
  }

  const opciones = await lotesDisponibles(loteActual.productoId, transaction);
  const elegida = opciones.find(
    (opcion) =>
      opcion.bodegaId === seleccion.bodegaId &&
      (opcion.lote || null) === (seleccion.lote || null) &&
      (opcion.fechaVencimiento || null) === (seleccion.fechaVencimiento || null),
  );
  if (!elegida) {
    throw new OrdenProduccionError('El lote seleccionado ya no tiene saldo disponible', 409);
  }

  const duplicada = await OrdenProduccionSimulacionLote.findOne({
    where: {
      id: { [Op.ne]: loteActual.id },
      detalleSimulacionId: loteActual.detalleSimulacionId,
      productoId: loteActual.productoId,
      bodegaId: elegida.bodegaId,
      lote: elegida.lote || null,
      fechaVencimiento: elegida.fechaVencimiento || null,
    },
    transaction,
  });
  if (duplicada) {
    throw new OrdenProduccionError('Ese lote ya está asignado en esta simulación', 409);
  }
  if (Number(loteActual.cantidad) > Number(elegida.saldo)) {
    throw new OrdenProduccionError(
      'El lote seleccionado no alcanza para la cantidad de esta asignación',
      409,
    );
  }

  await loteActual.update(
    {
      lote: elegida.lote || null,
      bodegaId: elegida.bodegaId,
      fechaVencimiento: elegida.fechaVencimiento || null,
      saldoDisponible: elegida.saldo,
      esSugerenciaFefo: false,
      seleccionManual: true,
    },
    { transaction },
  );
  const detalle = loteActual.detalle;
  const advertencias = [
    ...new Set([...(detalle.advertencias || []), 'Este lote no corresponde a la sugerencia FEFO.']),
  ];
  await detalle.update(
    {
      estado: detalle.estado === 'CRITICA' ? 'CRITICA' : 'ADVERTENCIA',
      advertencias,
    },
    { transaction },
  );
  return loteActual;
};

const claveLote = ({ productoId, bodegaId, lote, fechaVencimiento }) =>
  [productoId, bodegaId, lote || '', fechaVencimiento || ''].join('|');

const confirmarSalidaMp = async (orden, usuarioId, transaction) => {
  if (orden.estado !== 'SIMULADA') {
    throw new OrdenProduccionError('Solo una orden simulada puede confirmar la salida de MP', 409);
  }
  if (orden.movimientoSalidaId) {
    throw new OrdenProduccionError('Esta orden ya tiene una salida de materias primas', 409);
  }
  const movimientoExistente = await MovimientoInventario.findOne({
    where: { origen: 'OT', origenId: orden.id },
    transaction,
  });
  if (movimientoExistente) {
    throw new OrdenProduccionError('Esta orden ya generó un movimiento de salida', 409);
  }

  const simulacion = await OrdenProduccionSimulacion.findOne({
    where: { ordenProduccionId: orden.id },
    include: [
      {
        model: OrdenProduccionSimulacionDetalle,
        as: 'detalles',
        include: [
          {
            model: OrdenProduccionSimulacionLote,
            as: 'lotes',
            include: [{ model: Producto, as: 'producto' }],
          },
        ],
      },
    ],
    transaction,
  });
  if (!simulacion) {
    throw new OrdenProduccionError('La orden no tiene una simulación guardada', 409);
  }

  const asignaciones = [];
  const inconsistencias = [];
  for (const detalle of simulacion.detalles) {
    const requerida = Number(detalle.cantidadRequerida);
    const asignada = redondear(
      detalle.lotes.reduce((total, lote) => total + Number(lote.cantidad), 0),
    );
    if (Number(detalle.cantidadFaltante) > 0 || Math.abs(requerida - asignada) > 0.000001) {
      inconsistencias.push({
        componente: detalle.productoId || detalle.familiaMpCarnicaId,
        cantidadRequerida: requerida,
        cantidadAsignada: asignada,
        cantidadFaltante: Math.max(0, redondear(requerida - asignada)),
      });
    }
    for (const lote of detalle.lotes) {
      const cantidad = Number(lote.cantidad);
      if (!(cantidad > 0)) {
        throw new OrdenProduccionError('La simulación contiene una cantidad de lote no válida');
      }
      if (lote.producto.unidadMedidaId !== detalle.unidadMedidaId) {
        throw new OrdenProduccionError(
          `La unidad base de ${lote.producto.nombre} no coincide con la simulación`,
        );
      }
      asignaciones.push({
        productoId: lote.productoId,
        productoNombre: lote.producto.nombre,
        unidadMedidaId: detalle.unidadMedidaId,
        bodegaId: lote.bodegaId,
        lote: lote.lote || null,
        fechaVencimiento: lote.fechaVencimiento || null,
        cantidad,
      });
    }
  }
  if (inconsistencias.length) {
    const error = new OrdenProduccionError(
      'La simulación tiene materias primas incompletas y no puede generar la salida',
      409,
    );
    error.details = inconsistencias;
    throw error;
  }
  if (!asignaciones.length) {
    throw new OrdenProduccionError('La simulación no tiene lotes seleccionados', 409);
  }

  const bodegas = new Set(asignaciones.map((asignacion) => asignacion.bodegaId));
  if (bodegas.size !== 1) {
    throw new OrdenProduccionError(
      'La salida contiene lotes de varias bodegas. Seleccione lotes de una misma bodega antes de confirmar.',
      409,
    );
  }

  const consolidadas = new Map();
  asignaciones.forEach((asignacion) => {
    const clave = claveLote(asignacion);
    const actual = consolidadas.get(clave);
    consolidadas.set(clave, {
      ...asignacion,
      cantidad: redondear((actual?.cantidad || 0) + asignacion.cantidad),
    });
  });
  const salidas = [...consolidadas.values()];

  for (const clave of [...consolidadas.keys()].sort()) {
    await sequelize.query(`SELECT pg_advisory_xact_lock(hashtextextended(:clave, 0))`, {
      replacements: { clave },
      transaction,
    });
  }
  const saldos = await obtenerSaldosLotes(
    [...new Set(salidas.map((salida) => salida.productoId))],
    transaction,
  );
  const saldosPorClave = new Map(saldos.map((saldo) => [claveLote(saldo), Number(saldo.saldo)]));
  const faltantes = salidas
    .map((salida) => {
      const saldo = saldosPorClave.get(claveLote(salida)) || 0;
      return {
        productoId: salida.productoId,
        producto: salida.productoNombre,
        lote: salida.lote,
        bodegaId: salida.bodegaId,
        fechaVencimiento: salida.fechaVencimiento,
        cantidadRequerida: salida.cantidad,
        saldoActual: saldo,
        cantidadFaltante: Math.max(0, redondear(salida.cantidad - saldo)),
      };
    })
    .filter((faltante) => faltante.cantidadFaltante > 0);
  if (faltantes.length) {
    const error = new OrdenProduccionError(
      'Uno o más lotes ya no tienen saldo suficiente. Vuelva a simular la orden.',
      409,
    );
    error.details = faltantes;
    throw error;
  }

  const fechaSalida = new Date();
  const movimiento = await MovimientoInventario.create(
    {
      tipoDocumento: 'SA',
      numeroDocumento: await siguienteNumeroSalida(transaction),
      fecha: fechaSalida,
      bodegaId: salidas[0].bodegaId,
      estado: 'APLICADO',
      origen: 'OT',
      origenId: orden.id,
      usuarioId,
      observaciones: `Salida de materias primas confirmada desde la OT ${orden.numero}`,
    },
    { transaction },
  );
  await DetalleMovimiento.bulkCreate(
    salidas.map((salida) => ({
      movimientoInventarioId: movimiento.id,
      productoId: salida.productoId,
      unidadMedidaId: salida.unidadMedidaId,
      cantidad: salida.cantidad,
      lote: salida.lote,
      loteProveedor: salida.lote,
      fechaVencimiento: salida.fechaVencimiento,
      observaciones: `Consumo para la OT ${orden.numero}`,
    })),
    { transaction },
  );
  await orden.update(
    {
      movimientoSalidaId: movimiento.id,
      fechaSalidaMp: fechaSalida,
      usuarioSalidaMpId: usuarioId,
      estado: 'EN_PRODUCCION',
    },
    { transaction },
  );
  return movimiento;
};

module.exports = {
  OrdenProduccionError,
  asignarLotes,
  cambiarLoteSimulacion,
  confirmarSalidaMp,
  lotesDisponibles,
  obtenerSaldosLotes,
  ordenarFefo,
  reemplazarDetallesOrden,
  siguienteNumeroOrden,
  siguienteNumeroSalida,
  simularOrden,
  validarDetallesOrden,
};
