const {
  Desviacion,
  AccionRegla,
  AccionCriterio,
  TipoAccion,
  RespuestaElementoChecklist,
} = require('../../models');

const codigosDeDesviacion = async (desviacionId, transaction) => {
  const desviacion = await Desviacion.findByPk(desviacionId, {
    attributes: ['reglaCalidadId', 'respuestaElementoChecklistId'],
    transaction,
  });
  if (!desviacion) return new Set();

  let acciones = [];
  if (desviacion.reglaCalidadId) {
    acciones = await AccionRegla.findAll({
      where: { reglaCalidadId: desviacion.reglaCalidadId, estado: true },
      include: [{ model: TipoAccion, as: 'tipoAccion', where: { estado: true } }],
      transaction,
    });
  } else if (desviacion.respuestaElementoChecklistId) {
    const respuesta = await RespuestaElementoChecklist.findByPk(
      desviacion.respuestaElementoChecklistId,
      { attributes: ['criterioInspeccionId'], transaction },
    );
    if (respuesta) {
      acciones = await AccionCriterio.findAll({
        where: { criterioInspeccionId: respuesta.criterioInspeccionId, estado: true },
        include: [{ model: TipoAccion, as: 'tipoAccion', where: { estado: true } }],
        transaction,
      });
    }
  }
  return new Set(acciones.map((accion) => accion.tipoAccion.codigo));
};

const requisitosDeDesviacion = async (desviacionId, transaction) => {
  const codigos = await codigosDeDesviacion(desviacionId, transaction);
  return {
    requiereObservacion: codigos.has('EXIGIR_OBSERVACION'),
    requiereEvidencia: codigos.has('EXIGIR_EVIDENCIA'),
    requiereNuevaMedicion: codigos.has('VOLVER_A_MEDIR'),
    bloqueaContinuidad: codigos.has('BLOQUEAR_CONTINUIDAD'),
    generaAlerta: codigos.has('GENERAR_ALERTA'),
  };
};

module.exports = { codigosDeDesviacion, requisitosDeDesviacion };
