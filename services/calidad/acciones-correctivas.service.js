const {
  CampoAccionInstancia,
  EvidenciaAccionCorrectiva,
  SeguimientoAccionCorrectiva,
} = require('../../models');
const { ApiError } = require('../../utils/ApiError');
const { requisitosDeDesviacion } = require('./comportamientos-accion.service');

const validarRequisitosCierre = async (accion, transaction) => {
  const requisitos = await requisitosDeDesviacion(accion.desviacionId, transaction);
  const camposPendientes = await CampoAccionInstancia.findAll({
    attributes: ['nombre'],
    where: {
      accionCorrectivaId: accion.id,
      obligatorio: true,
      valorTexto: null,
    },
    transaction,
  });
  if (camposPendientes.length) {
    throw new ApiError(
      `Completa los campos obligatorios: ${camposPendientes.map((campo) => campo.nombre).join(', ')}`,
      409,
    );
  }
  if (requisitos.requiereObservacion) {
    const observaciones = await SeguimientoAccionCorrectiva.count({
      where: { accionCorrectivaId: accion.id, tipoRegistro: 'OBSERVACION' },
      transaction,
    });
    if (!observaciones)
      throw new ApiError(
        'Debes registrar el comentario del tratamiento antes de enviar a aprobación',
        409,
      );
  }
  if (requisitos.requiereEvidencia) {
    const evidencias = await EvidenciaAccionCorrectiva.count({
      where: { accionCorrectivaId: accion.id },
      transaction,
    });
    if (!evidencias)
      throw new ApiError('Adjunta la evidencia requerida antes de enviar a aprobación', 409);
  }
  if (requisitos.requiereNuevaMedicion) {
    const mediciones = await SeguimientoAccionCorrectiva.count({
      where: {
        accionCorrectivaId: accion.id,
        tipoRegistro: 'NUEVA_MEDICION',
        resultadoCumple: true,
      },
      transaction,
    });
    if (!mediciones) {
      throw new ApiError(
        'Registra una nueva medición que cumpla antes de enviar a aprobación',
        409,
      );
    }
  }
  return requisitos;
};

module.exports = { validarRequisitosCierre, requisitosDeDesviacion };
