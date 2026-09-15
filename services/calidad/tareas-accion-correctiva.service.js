const { EvidenciaAccionCorrectiva, TareaAccionCorrectiva } = require('../../models');
const { ApiError } = require('../../utils/ApiError');

const hoyBogota = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

const diasHasta = (fecha) => {
  const hoy = new Date(`${hoyBogota()}T12:00:00Z`);
  const limite = new Date(`${fecha}T12:00:00Z`);
  return Math.round((limite.getTime() - hoy.getTime()) / 86400000);
};

const presentarTarea = (tarea) => {
  if (!tarea) return null;
  const datos = typeof tarea.toJSON === 'function' ? tarea.toJSON() : tarea;
  const diasRestantes = diasHasta(datos.fechaLimite);
  return {
    ...datos,
    vencida: datos.estado === 'PENDIENTE' && diasRestantes < 0,
    proximaVencer: datos.estado === 'PENDIENTE' && diasRestantes >= 0 && diasRestantes <= 3,
  };
};

const evidenciasDeTarea = (tareaId, transaction) =>
  EvidenciaAccionCorrectiva.count({
    where: { tareaAccionCorrectivaId: tareaId },
    transaction,
  });

const validarTareaCompletable = async (tarea, transaction) => {
  if (!tarea.documentacion?.trim()) {
    throw new ApiError('Documenta lo realizado antes de completar la tarea', 409);
  }
  if (!(await evidenciasDeTarea(tarea.id, transaction))) {
    throw new ApiError('Adjunta al menos una evidencia de la tarea antes de completarla', 409);
  }
};

const validarTareaParaAprobacion = async (accionId, transaction) => {
  const tarea = await TareaAccionCorrectiva.findOne({
    where: { accionCorrectivaId: accionId },
    transaction,
  });
  if (!tarea) return null;

  await validarTareaCompletable(tarea, transaction);
  if (tarea.estado !== 'COMPLETADA') {
    throw new ApiError(
      'La tarea asignada sigue pendiente. Complétala antes de enviar la acción a aprobación',
      409,
    );
  }
  return tarea;
};

module.exports = {
  evidenciasDeTarea,
  presentarTarea,
  validarTareaCompletable,
  validarTareaParaAprobacion,
};
