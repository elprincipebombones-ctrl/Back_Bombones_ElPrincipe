const { QueryTypes } = require('sequelize');
const {
  sequelize,
  Bodega,
  OrdenProduccion,
  OrdenProduccionDetalle,
  Producto,
  ResultadoProduccion,
  ReporteProduccion,
  FormulaProducto,
  FormulaComponente,
  MovimientoInventario,
  DetalleMovimiento,
  Usuario,
  UnidadMedida,
  MermaProduccion,
} = require('../../models');
const { resolverBodegaPep } = require('./bodega-pep.service');
const { normalizarCantidad } = require('./conversion-unidad.service');

const redondear = (valor) => Number(Number(valor).toFixed(6));
const error = (message, status = 422, details = null) =>
  Object.assign(new Error(message), { status, details });

const siguienteNumero = async (tipo, transaction) => {
  const secuencias = {
    EN: 'movimientos_en_numero_seq',
    SA: 'movimientos_sa_numero_seq',
    LOTE: 'lotes_pt_numero_seq',
  };
  if (!secuencias[tipo]) throw error('Tipo de consecutivo no válido');
  const [fila] = await sequelize.query(`SELECT nextval('${secuencias[tipo]}') AS numero`, {
    type: QueryTypes.SELECT,
    transaction,
  });
  return `${tipo}-${String(fila.numero).padStart(6, '0')}`;
};

const crearMovimiento = async ({
  tipo,
  bodegaId,
  origen,
  origenId,
  usuarioId,
  detalles,
  transaction,
}) => {
  const movimiento = await MovimientoInventario.create(
    {
      tipoDocumento: tipo,
      numeroDocumento: await siguienteNumero(tipo, transaction),
      fecha: new Date(),
      bodegaId,
      origen,
      origenId,
      usuarioId,
      estado: 'APLICADO',
    },
    { transaction },
  );
  await DetalleMovimiento.bulkCreate(
    detalles.map((detalle) => ({
      ...detalle,
      movimientoInventarioId: movimiento.id,
      sentido: tipo === 'EN' ? 'ENTRADA' : 'SALIDA',
    })),
    { transaction },
  );
  return movimiento;
};

const iniciarProduccion = async ({ ordenId, resultados, usuarioId, transaction }) => {
  const orden = await OrdenProduccion.findByPk(ordenId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!orden) throw error('La orden no existe', 404);
  if (orden.estado !== 'LISTA_PRODUCCION' || !orden.movimientoPepId)
    throw error('La OT debe estar LISTA_PRODUCCION con MP en PEP', 409);
  await resolverBodegaPep(transaction);
  const detalles = await OrdenProduccionDetalle.findAll({
    where: { ordenProduccionId: ordenId },
    include: [{ model: Producto, as: 'productoTerminado' }],
    transaction,
  });
  const entradas = new Map((resultados || []).map((r) => [r.productoTerminadoId, r]));
  if (
    !detalles.length ||
    entradas.size !== detalles.length ||
    resultados.length !== detalles.length
  )
    throw error('Debe diligenciar todos los PT, sin repetir productos');
  for (const detalle of detalles) {
    const fecha = entradas.get(detalle.productoTerminadoId)?.fechaVencimiento;
    if (
      typeof fecha !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
      !Number.isFinite(Date.parse(fecha)) ||
      new Date(fecha).toISOString().slice(0, 10) !== fecha
    ) {
      throw error('La fecha de vencimiento manual es obligatoria y debe ser válida para cada PT');
    }
  }
  for (const detalle of detalles) {
    await ResultadoProduccion.create(
      {
        ordenProduccionId: ordenId,
        productoTerminadoId: detalle.productoTerminadoId,
        cantidadPlaneada: detalle.cantidad,
        cantidadProducida: 0,
        unidadMedidaId: detalle.productoTerminado.unidadMedidaId,
        lotePt: await siguienteNumero('LOTE', transaction),
        fechaVencimientoFinal: entradas.get(detalle.productoTerminadoId).fechaVencimiento,
      },
      { transaction },
    );
  }
  await orden.update(
    { estado: 'EN_PRODUCCION', usuarioInicioId: usuarioId, fechaInicio: new Date() },
    { transaction },
  );
};

// El saldo por OT nunca se reconstruye desde el saldo general de la bodega.
const saldosPep = async (orden, transaction) =>
  sequelize.query(
    `
  SELECT d.producto_id AS "productoId", p.nombre AS producto,
    p.familia_mp_carnica_id AS "familiaMpCarnicaId",
    d.unidad_medida_id AS "unidadMedidaId", COALESCE(d.lote, d.lote_proveedor) AS lote,
    d.fecha_vencimiento::text AS "fechaVencimiento",
    SUM(CASE WHEN m.tipo_documento = 'EN' THEN d.cantidad ELSE -d.cantidad END)::numeric AS saldo
  FROM detalle_movimiento d
  JOIN movimientos_inventario m ON m.id = d.movimiento_inventario_id
  JOIN productos p ON p.id = d.producto_id
  WHERE m.estado = 'APLICADO' AND (
    m.id = :entrada OR (m.origen = 'PRODUCCION_PARCIAL' AND m.tipo_documento = 'SA'
      AND m.origen_id IN (SELECT id FROM reportes_produccion WHERE orden_produccion_id = :ordenId))
    OR m.id IN (
      SELECT CASE WHEN tipo = 'ADICIONAL' THEN movimiento_entrada_id ELSE movimiento_salida_id END
      FROM solicitudes_movimiento_ot WHERE orden_produccion_id = :ordenId AND estado = 'ATENDIDA'
    )
  )
  GROUP BY d.producto_id, p.nombre, p.familia_mp_carnica_id, d.unidad_medida_id,
    COALESCE(d.lote, d.lote_proveedor), d.fecha_vencimiento
  ORDER BY d.fecha_vencimiento ASC NULLS LAST, COALESCE(d.lote, d.lote_proveedor), d.producto_id`,
    {
      replacements: { entrada: orden.movimientoPepId, ordenId: orden.id },
      type: QueryTypes.SELECT,
      transaction,
    },
  );

const explosionInversa = async (productoId, cantidad, lotes, transaction) => {
  const formula = await FormulaProducto.findOne({
    where: { productoTerminadoId: productoId, activo: true },
    include: [
      {
        model: FormulaComponente,
        as: 'componentes',
        include: [{ model: Producto, as: 'producto' }],
      },
    ],
    transaction,
  });
  if (!formula?.componentes.length)
    throw error('El PT no tiene una fórmula vigente con componentes');
  const salidas = [];
  const advertenciasPep = [];
  // Primero los productos específicos; las familias usan el saldo restante compatible.
  const componentes = [...formula.componentes].sort(
    (a, b) => Number(Boolean(b.productoId)) - Number(Boolean(a.productoId)),
  );
  for (const componente of componentes) {
    const candidatos = lotes.filter((lote) =>
      componente.productoId
        ? lote.productoId === componente.productoId
        : lote.familiaMpCarnicaId === componente.familiaMpCarnicaId,
    );
    const unidadBaseId =
      componente.producto?.unidadMedidaId ||
      candidatos[0]?.unidadMedidaId ||
      componente.unidadMedidaId;
    if (candidatos.some((lote) => lote.unidadMedidaId !== unidadBaseId))
      throw error('La MP en PEP no tiene una unidad base común con la fórmula');
    const conversion = await normalizarCantidad({
      cantidad: componente.cantidad,
      unidadOrigenId: componente.unidadMedidaId,
      unidadBaseId,
      transaction,
    });
    const requerido = redondear(conversion.cantidadNormalizada * cantidad);
    if (!(requerido > 0) || !Number.isFinite(requerido))
      throw error('El consumo teórico no es representable con seis decimales');
    const disponible = redondear(candidatos.reduce((suma, lote) => suma + Number(lote.saldo), 0));
    if (disponible <= requerido) {
      const unidad = await UnidadMedida.findByPk(unidadBaseId, { transaction });
      advertenciasPep.push({
        producto:
          componente.producto?.nombre ||
          candidatos[0]?.producto ||
          `Familia ${componente.familiaMpCarnicaId}`,
        productoId: componente.productoId,
        requerido,
        disponible,
        consumido: Math.min(requerido, disponible),
        faltante: redondear(requerido - disponible),
        unidad: unidad?.simbolo || '',
        unidadMedidaId: unidadBaseId,
      });
    }
    let pendiente = requerido;
    for (const lote of candidatos) {
      const consumo = redondear(Math.min(Number(lote.saldo), pendiente));
      if (consumo <= 0) continue;
      salidas.push({
        productoId: lote.productoId,
        unidadMedidaId: lote.unidadMedidaId,
        lote: lote.lote,
        fechaVencimiento: lote.fechaVencimiento,
        cantidad: consumo,
      });
      lote.saldo = redondear(Number(lote.saldo) - consumo);
      pendiente = redondear(pendiente - consumo);
      if (!pendiente) break;
    }
  }
  return { salidas, advertenciasPep };
};

const registrarParcial = async ({
  ordenId,
  productoTerminadoId,
  cantidad: valor,
  usuarioId,
  transaction,
}) => {
  const orden = await OrdenProduccion.findByPk(ordenId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!orden) throw error('La orden no existe', 404);
  if (orden.estado !== 'EN_PRODUCCION' || !orden.movimientoPepId || !orden.fechaInicio)
    throw error('La OT no tiene producción parcial iniciada', 409);
  const cantidad = redondear(valor);
  if (!Number.isFinite(cantidad) || cantidad <= 0)
    throw error('La cantidad parcial debe ser mayor que cero');
  const resultado = await ResultadoProduccion.findOne({
    where: { ordenProduccionId: ordenId, productoTerminadoId },
    transaction,
  });
  if (!resultado?.lotePt || !resultado.fechaVencimientoFinal)
    throw error('El PT no tiene lote y vencimiento asignados en esta OT');
  const pep = await resolverBodegaPep(transaction);
  const destino = await Bodega.findOne({
    where: { esBodegaPtDefault: true, estado: true },
    transaction,
  });
  if (!destino || destino.id === pep.id)
    throw error('Configure una bodega PT predeterminada activa diferente de PEP', 409);
  // Mismo bloqueo de bodegas que usa Inventario: serializa consumos y traslados físicos.
  await Bodega.findAll({
    where: { id: [pep.id, destino.id] },
    order: [['id', 'ASC']],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  const lotes = await saldosPep(orden, transaction);
  const mermas = await MermaProduccion.findAll({
    where: { ordenProduccionId: ordenId, tipoMerma: 'MP' },
    transaction,
  });
  for (const merma of mermas) {
    let pendiente = Number(merma.cantidad);
    for (const lote of lotes.filter((l) => l.productoId === merma.productoId)) {
      const descontar = Math.min(Math.max(0, Number(lote.saldo)), pendiente);
      lote.saldo = redondear(Number(lote.saldo) - descontar);
      pendiente = redondear(pendiente - descontar);
    }
  }
  // Además del cupo de la OT, comprobar existencia física (incluye ajustes y traslados).
  for (const lote of lotes) {
    const [fisico] = await sequelize.query(
      `SELECT COALESCE(SUM(d.cantidad * CASE
      WHEN m.tipo_documento IN ('EN', 'AJN', 'TRN') THEN 1
      WHEN m.tipo_documento IN ('SA', 'AJS', 'TRS') THEN -1
      WHEN d.sentido = 'ENTRADA' THEN 1 WHEN d.sentido = 'SALIDA' THEN -1 ELSE 0 END), 0) AS saldo
      FROM detalle_movimiento d JOIN movimientos_inventario m ON m.id = d.movimiento_inventario_id
      WHERE m.estado = 'APLICADO' AND m.bodega_id = :bodegaId AND d.producto_id = :productoId
      AND d.unidad_medida_id = :unidadMedidaId AND COALESCE(d.lote, d.lote_proveedor, '') = COALESCE(:lote, '')
      AND d.fecha_vencimiento IS NOT DISTINCT FROM :fechaVencimiento::date`,
      {
        replacements: { ...lote, bodegaId: pep.id },
        type: QueryTypes.SELECT,
        transaction,
      },
    );
    lote.saldo = Math.max(0, Math.min(Number(lote.saldo), Number(fisico.saldo)));
  }
  const { salidas, advertenciasPep } = await explosionInversa(
    productoTerminadoId,
    cantidad,
    lotes,
    transaction,
  );
  const reporte = await ReporteProduccion.create(
    {
      ordenProduccionId: ordenId,
      productoTerminadoId,
      lote: resultado.lotePt,
      cantidad,
      unidadMedidaId: resultado.unidadMedidaId,
      usuarioId,
      fecha: new Date(),
    },
    { transaction },
  );
  const comun = { origen: 'PRODUCCION_PARCIAL', origenId: reporte.id, usuarioId, transaction };
  // Sin saldo no se crea una salida vacía ni de cantidad cero.
  const salida = salidas.length
    ? await crearMovimiento({
        ...comun,
        tipo: 'SA',
        bodegaId: pep.id,
        detalles: salidas,
      })
    : null;
  const entrada = await crearMovimiento({
    ...comun,
    tipo: 'EN',
    bodegaId: destino.id,
    detalles: [
      {
        productoId: productoTerminadoId,
        cantidad,
        unidadMedidaId: resultado.unidadMedidaId,
        lote: resultado.lotePt,
        fechaVencimiento: resultado.fechaVencimientoFinal,
      },
    ],
  });
  await reporte.update(
    { movimientoSalidaId: salida?.id || null, movimientoEntradaId: entrada.id },
    { transaction },
  );
  const acumulado = await ReporteProduccion.sum('cantidad', {
    where: { ordenProduccionId: ordenId, productoTerminadoId },
    transaction,
  });
  await resultado.update(
    { cantidadProducida: acumulado, bodegaDestinoId: destino.id },
    { transaction },
  );
  reporte.setDataValue('advertenciasPep', advertenciasPep);
  return reporte;
};

const listarParciales = (ordenId, transaction) =>
  ReporteProduccion.findAll({
    where: { ordenProduccionId: ordenId },
    include: [
      { model: Producto, as: 'productoTerminado' },
      { model: UnidadMedida, as: 'unidadMedida' },
      { model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] },
      { model: MovimientoInventario, as: 'movimientoSalida' },
      { model: MovimientoInventario, as: 'movimientoEntrada' },
    ],
    order: [
      ['fecha', 'DESC'],
      ['id', 'DESC'],
    ],
    transaction,
  });

module.exports = {
  iniciarProduccion,
  registrarParcial,
  listarParciales,
  saldosPep,
  explosionInversa,
  crearMovimiento,
  siguienteNumero,
};
