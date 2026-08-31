const {
  VersionFormato,
  SeccionFormato,
  CampoFormato,
  ReglaCalidad,
  ChecklistSeccion,
} = require('../../models');

const mensaje = 'Solo se puede modificar la estructura de una versión en BORRADOR';

const validarVersion = async (versionFormatoId, transaction) => {
  if (!versionFormatoId) return null;
  const version = await VersionFormato.findByPk(versionFormatoId, { transaction });
  return version && version.estadoVersion !== 'BORRADOR' ? mensaje : null;
};

const validarSeccion = async (seccionFormatoId, transaction) => {
  if (!seccionFormatoId) return null;
  const seccion = await SeccionFormato.findByPk(seccionFormatoId, { transaction });
  return validarVersion(seccion?.versionFormatoId, transaction);
};

const validarCampo = async (campoFormatoId) => {
  if (!campoFormatoId) return null;
  const campo = await CampoFormato.findByPk(campoFormatoId);
  return validarSeccion(campo?.seccionFormatoId);
};

const validarRegla = async (reglaCalidadId) => {
  if (!reglaCalidadId) return null;
  const regla = await ReglaCalidad.findByPk(reglaCalidadId);
  return validarCampo(regla?.campoFormatoId);
};

const validarChecklist = async (checklistSeccionId, transaction) => {
  if (!checklistSeccionId) return null;
  const checklist = await ChecklistSeccion.findByPk(checklistSeccionId, { transaction });
  return validarSeccion(checklist?.seccionFormatoId, transaction);
};

module.exports = { validarVersion, validarSeccion, validarCampo, validarRegla, validarChecklist };
