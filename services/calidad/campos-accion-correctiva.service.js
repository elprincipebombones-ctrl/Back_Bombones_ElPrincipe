const {
  CampoAccionCorrectiva,
  ParametroCampoAccion,
  CriterioCampoAccion,
  CampoAccionInstancia,
} = require('../../models');
const { ApiError } = require('../../utils/ApiError');

const configuracionOrigen = {
  PARAMETRO: {
    modelo: ParametroCampoAccion,
    campoOrigen: 'parametroCalidadId',
  },
  CRITERIO: {
    modelo: CriterioCampoAccion,
    campoOrigen: 'criterioInspeccionId',
  },
};

const listarConfiguracion = async ({ tipoOrigen, origenId, transaction }) => {
  const configuracion = configuracionOrigen[tipoOrigen];
  if (!configuracion) throw new ApiError('Origen de campos de acción no soportado', 422);
  return configuracion.modelo.findAll({
    where: { [configuracion.campoOrigen]: origenId },
    include: [{ model: CampoAccionCorrectiva, as: 'campo' }],
    order: [['orden', 'ASC']],
    transaction,
  });
};

const sincronizarConfiguracion = async ({ tipoOrigen, origenId, campos, transaction }) => {
  const configuracion = configuracionOrigen[tipoOrigen];
  if (!configuracion) throw new ApiError('Origen de campos de acción no soportado', 422);

  const ids = campos.map((campo) => campo.campoAccionCorrectivaId);
  const asignacionesActuales = await configuracion.modelo.findAll({
    attributes: ['campoAccionCorrectivaId'],
    where: { [configuracion.campoOrigen]: origenId },
    transaction,
  });
  const idsAsignados = new Set(
    asignacionesActuales.map((asignacion) => asignacion.campoAccionCorrectivaId),
  );
  const disponibles = ids.length
    ? await CampoAccionCorrectiva.findAll({
        where: { id: ids },
        transaction,
      })
    : [];
  const camposPorId = new Map(disponibles.map((campo) => [campo.id, campo]));
  const invalido = ids.find((id) => {
    const campo = camposPorId.get(id);
    return !campo || (!campo.estado && !idsAsignados.has(id));
  });
  if (invalido) {
    throw new ApiError('Uno o más campos de acción no existen o están inactivos', 422);
  }

  await configuracion.modelo.destroy({
    where: { [configuracion.campoOrigen]: origenId },
    transaction,
  });
  if (campos.length) {
    await configuracion.modelo.bulkCreate(
      campos.map((campo, indice) => ({
        [configuracion.campoOrigen]: origenId,
        campoAccionCorrectivaId: campo.campoAccionCorrectivaId,
        orden: campo.orden ?? indice + 1,
        obligatorioOverride: campo.obligatorioOverride ?? null,
      })),
      { transaction },
    );
  }
  return listarConfiguracion({ tipoOrigen, origenId, transaction });
};

const crearSnapshot = async ({
  accionCorrectivaId,
  parametroCalidadId,
  criterioInspeccionId,
  transaction,
}) => {
  const tipoOrigen = parametroCalidadId ? 'PARAMETRO' : 'CRITERIO';
  const origenId = parametroCalidadId ?? criterioInspeccionId;
  if (!origenId) return [];

  const configuraciones = await listarConfiguracion({ tipoOrigen, origenId, transaction });
  const activas = configuraciones.filter((configuracion) => configuracion.campo?.estado);
  if (!activas.length) return [];

  return CampoAccionInstancia.bulkCreate(
    activas.map((configuracion) => ({
      accionCorrectivaId,
      campoAccionCorrectivaId: configuracion.campoAccionCorrectivaId,
      codigo: configuracion.campo.codigo,
      nombre: configuracion.campo.nombre,
      obligatorio: configuracion.obligatorioOverride ?? configuracion.campo.obligatorio,
      orden: configuracion.orden,
      valorTexto: null,
    })),
    { transaction },
  );
};

module.exports = {
  listarConfiguracion,
  sincronizarConfiguracion,
  crearSnapshot,
};
