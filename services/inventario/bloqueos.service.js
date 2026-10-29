const { Op, QueryTypes, Transaction } = require('sequelize');
const models = require('../../models');
const { ApiError } = require('../../utils/ApiError');

const normalizarNullable = (valor) => {
  if (valor === undefined || valor === null) return null;
  const limpio = String(valor).trim();
  return limpio === '' ? null : limpio;
};
const normalizarClave = (data) => ({
  productoId: data.productoId,
  bodegaId: data.bodegaId,
  unidadMedidaId: data.unidadMedidaId,
  lote: normalizarNullable(data.lote),
  fechaVencimiento: normalizarNullable(data.fechaVencimiento),
});
const whereClave = (clave) => ({ ...normalizarClave(clave), estado: 'CONGELADO' });

const claveSerializacion = (clave) => {
  const c = normalizarClave(clave);
  return JSON.stringify([
    c.productoId,
    c.bodegaId,
    c.unidadMedidaId,
    c.lote,
    c.fechaVencimiento,
  ]);
};

async function bloquearClave(clave, transaction) {
  if (!transaction) return;
  await models.sequelize.query('SELECT pg_advisory_xact_lock(hashtextextended(:clave, 0))', {
    replacements: { clave: claveSerializacion(clave) },
    transaction,
  });
}

async function saldoFisico(clave, transaction) {
  const c = normalizarClave(clave);
  const [fila] = await models.sequelize.query(
    `SELECT COUNT(d.id)::int AS movimientos,
      COUNT(d.id) FILTER (WHERE CASE WHEN m.tipo_documento IN ('EN','AJN','TRN') THEN 1 WHEN m.tipo_documento IN ('SA','AJS','TRS') THEN -1 WHEN d.sentido='ENTRADA' THEN 1 WHEN d.sentido='SALIDA' THEN -1 ELSE 0 END=0)::int AS pendientes,
      COALESCE(SUM(d.cantidad * CASE WHEN m.tipo_documento IN ('EN','AJN','TRN') THEN 1 WHEN m.tipo_documento IN ('SA','AJS','TRS') THEN -1 WHEN d.sentido='ENTRADA' THEN 1 WHEN d.sentido='SALIDA' THEN -1 ELSE 0 END),0)::text AS saldo
    FROM detalle_movimiento d JOIN movimientos_inventario m ON m.id=d.movimiento_inventario_id
    WHERE m.estado='APLICADO' AND m.fecha<=CURRENT_TIMESTAMP AND d.producto_id=:productoId AND m.bodega_id=:bodegaId
      AND d.unidad_medida_id=:unidadMedidaId AND COALESCE(d.lote,d.lote_proveedor,'')=COALESCE(:lote,'')
      AND COALESCE(d.fecha_vencimiento,DATE '0001-01-01')=COALESCE(:fechaVencimiento::date,DATE '0001-01-01')`,
    { replacements: c, type: QueryTypes.SELECT, transaction },
  );
  if (!fila || fila.movimientos === 0) throw new ApiError('La existencia indicada no existe.', 404);
  return fila.pendientes > 0 ? null : fila.saldo;
}
const includes = [
  { model: models.Producto, as: 'producto', attributes: ['id', 'codigo', 'nombre'] },
  { model: models.Bodega, as: 'bodega', attributes: ['id', 'codigo', 'nombre'] },
  {
    model: models.UnidadMedida,
    as: 'unidadMedida',
    attributes: ['id', 'codigo', 'nombre', 'simbolo'],
  },
  { model: models.Usuario, as: 'congeladoPor', attributes: ['id', 'nombre'] },
  { model: models.Usuario, as: 'liberadoPor', attributes: ['id', 'nombre'] },
  ...(models.Inspeccion
    ? [{ model: models.Inspeccion, as: 'inspeccionCalidad', attributes: ['id'] }]
    : []),
  ...(models.AccionCorrectiva
    ? [{ model: models.AccionCorrectiva, as: 'accionCorrectiva', attributes: ['id'] }]
    : []),
];
async function auditar(evento, bloqueo, usuarioId, contexto, transaction) {
  return models.InventarioEventoAuditoria.create(
    {
      evento,
      usuarioId,
      bloqueoId: bloqueo.id,
      productoId: bloqueo.productoId,
      bodegaId: bloqueo.bodegaId,
      unidadMedidaId: bloqueo.unidadMedidaId,
      lote: bloqueo.lote,
      fechaVencimiento: bloqueo.fechaVencimiento,
      motivo: bloqueo.motivo,
      origen: bloqueo.origen,
      ip: contexto?.ip || null,
      metadatos: contexto?.metadatos || null,
      ocurridoEn: new Date(),
    },
    { transaction },
  );
}
async function congelar(payload, usuarioId, contexto = {}) {
  const clave = normalizarClave(payload);
  try {
    return await models.sequelize.transaction(
      { isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE },
      async (transaction) => {
        await bloquearClave(clave, transaction);
        await models.Bodega.findByPk(clave.bodegaId, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        await saldoFisico(clave, transaction);
        const ahora = new Date();
        let bloqueo;
        try {
          bloqueo = await models.InventarioBloqueoLote.create(
            {
              ...clave,
              estado: 'CONGELADO',
              motivo: payload.motivo.trim(),
              origen: payload.origen || null,
              inspeccionCalidadId: payload.inspeccionCalidadId || null,
              accionCorrectivaId: payload.accionCorrectivaId || null,
              congeladoPorId: usuarioId,
              congeladoEn: ahora,
            },
            { transaction },
          );
        } catch (error) {
          if (error.name === 'SequelizeUniqueConstraintError')
            throw new ApiError('La existencia ya tiene un bloqueo activo.', 409, {
              codigo: 'EXISTENCIA_YA_CONGELADA',
            });
          throw error;
        }
        await auditar('INVENTARIO_EXISTENCIA_CONGELADA', bloqueo, usuarioId, contexto, transaction);
        return obtener(bloqueo.id, transaction);
      },
    );
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError' || error.parent?.code === '40001')
      throw new ApiError('La existencia ya tiene un bloqueo activo.', 409, {
        codigo: 'EXISTENCIA_YA_CONGELADA',
      });
    throw error;
  }
}
async function liberar(id, nota, usuarioId, contexto = {}) {
  return models.sequelize.transaction(async (transaction) => {
    const bloqueo = await models.InventarioBloqueoLote.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!bloqueo) throw new ApiError('Bloqueo no encontrado.', 404);
    if (bloqueo.estado !== 'CONGELADO')
      throw new ApiError('La existencia ya fue liberada.', 409, { codigo: 'BLOQUEO_YA_LIBERADO' });
    await bloqueo.update(
      {
        estado: 'LIBERADO',
        notaLiberacion: nota.trim(),
        liberadoPorId: usuarioId,
        liberadoEn: new Date(),
      },
      { transaction },
    );
    await auditar('INVENTARIO_EXISTENCIA_LIBERADA', bloqueo, usuarioId, contexto, transaction);
    return obtener(id, transaction);
  });
}
async function obtener(id, transaction) {
  const item = await models.InventarioBloqueoLote.findByPk(id, { include: includes, transaction });
  if (!item) throw new ApiError('Bloqueo no encontrado.', 404);
  return item;
}
async function listar(filtros = {}, historial = false) {
  const pagina = Number(filtros.pagina || 1),
    limite = Number(filtros.limite || 50);
  const where = {};
  if (!historial) where.estado = filtros.estado || 'CONGELADO';
  else if (filtros.estado) where.estado = filtros.estado;
  for (const k of ['productoId', 'bodegaId']) if (filtros[k]) where[k] = filtros[k];
  if (filtros.lote !== undefined) where.lote = normalizarNullable(filtros.lote);
  if (filtros.fechaDesde || filtros.fechaHasta) {
    const hasta = filtros.fechaHasta ? new Date(`${filtros.fechaHasta}T00:00:00.000Z`) : null;
    if (hasta) hasta.setUTCDate(hasta.getUTCDate() + 1);
    where.congeladoEn = {
      ...(filtros.fechaDesde && { [Op.gte]: new Date(`${filtros.fechaDesde}T00:00:00.000Z`) }),
      ...(hasta && { [Op.lt]: hasta }),
    };
  }
  const { rows, count } = await models.InventarioBloqueoLote.findAndCountAll({
    where,
    include: includes,
    order: [
      ['congeladoEn', 'DESC'],
      ['id', 'DESC'],
    ],
    limit: limite,
    offset: (pagina - 1) * limite,
    distinct: true,
  });
  return { filas: rows, total: count, pagina, limite };
}
async function estadoExistencia(clave) {
  const bloqueoActivo = await models.InventarioBloqueoLote.findOne({
    where: whereClave(clave),
    include: [{ model: models.Usuario, as: 'congeladoPor', attributes: ['id', 'nombre'] }],
  });
  return { estadoDisponibilidad: bloqueoActivo ? 'CONGELADO' : 'DISPONIBLE', bloqueoActivo };
}
async function verificarDisponible(clave, contexto = {}, transaction) {
  await bloquearClave(clave, transaction);
  const bloqueo = await models.InventarioBloqueoLote.findOne({
    where: whereClave(clave),
    transaction,
  });
  if (!bloqueo) return null;
  // El evento debe sobrevivir al rollback de la operación que se rechaza.
  if (contexto.usuarioId)
    await auditar('INTENTO_USO_EXISTENCIA_CONGELADA', bloqueo, contexto.usuarioId, contexto);
  throw new ApiError('La existencia está congelada y no puede utilizarse.', 409, {
    codigo: 'EXISTENCIA_CONGELADA',
    bloqueoId: bloqueo.id,
    motivo: bloqueo.motivo,
  });
}
module.exports = {
  congelar,
  liberar,
  listar,
  obtener,
  estadoExistencia,
  verificarDisponible,
  normalizarClave,
  bloquearClave,
  saldoFisico,
};
