const { QueryTypes, Op } = require('sequelize');
const { sequelize, Inspeccion, Desviacion, AccionCorrectiva } = require('../../models');
const { ApiError } = require('../../utils/ApiError');

const ESTADOS_EDITABLES = new Set(['BORRADOR', 'EN_PROCESO']);
const ESTADOS_ABIERTOS = ['BORRADOR', 'EN_PROCESO', 'PENDIENTE_ACCION'];

const fechaActual = async (transaction) => {
  const [resultado] = await sequelize.query('SELECT CURRENT_DATE::text AS fecha', {
    type: QueryTypes.SELECT,
    transaction,
  });
  return resultado.fecha;
};

const estadoCierreVencida = async (inspeccionId, transaction) => {
  const desviacionesAbiertas = await Desviacion.count({
    where: { inspeccionId, estado: { [Op.ne]: 'CERRADA' } },
    transaction,
  });
  const accionesAbiertas = await AccionCorrectiva.count({
    where: { estado: { [Op.ne]: 'CERRADA' } },
    include: [
      {
        model: Desviacion,
        as: 'desviacion',
        where: { inspeccionId },
        attributes: [],
        required: true,
      },
    ],
    transaction,
  });
  return desviacionesAbiertas || accionesAbiertas ? 'PENDIENTE_ACCION' : 'CERRADA_INCOMPLETA';
};

const cerrarSiVencida = async (inspeccion, transaction) => {
  if (!inspeccion || !ESTADOS_ABIERTOS.includes(inspeccion.estado)) return inspeccion;
  const hoy = await fechaActual(transaction);
  if (inspeccion.fechaInspeccion >= hoy) return inspeccion;
  const estado = await estadoCierreVencida(inspeccion.id, transaction);
  if (estado !== inspeccion.estado) await inspeccion.update({ estado }, { transaction });
  return inspeccion;
};

const validarEditable = async (inspeccion, transaction) => {
  await cerrarSiVencida(inspeccion, transaction);
  const hoy = await fechaActual(transaction);
  if (inspeccion.fechaInspeccion < hoy) {
    throw new ApiError('La inspección pertenece a un día anterior y está bloqueada', 409);
  }
  if (!ESTADOS_EDITABLES.has(inspeccion.estado)) {
    throw new ApiError(`La inspección en estado ${inspeccion.estado} no admite cambios`, 409);
  }
};

const cerrarVencidas = async () => {
  const transaction = await sequelize.transaction();
  try {
    const hoy = await fechaActual(transaction);
    const inspecciones = await Inspeccion.findAll({
      where: { fechaInspeccion: { [Op.lt]: hoy }, estado: ESTADOS_ABIERTOS },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    for (const inspeccion of inspecciones) await cerrarSiVencida(inspeccion, transaction);
    await transaction.commit();
    return inspecciones.length;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

module.exports = {
  ESTADOS_EDITABLES,
  fechaActual,
  cerrarSiVencida,
  cerrarVencidas,
  validarEditable,
};
