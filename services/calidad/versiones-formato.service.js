const { Op } = require('sequelize');
const {
  VersionFormato,
  SeccionFormato,
  CampoFormato,
  OpcionCampo,
  ChecklistSeccion,
  ElementoChecklist,
} = require('../../models');
const { ApiError } = require('../../utils/ApiError');

const copiarAtributos = (registro, atributos) =>
  Object.fromEntries(atributos.map((atributo) => [atributo, registro[atributo]]));

const clonarContenido = async (origenId, destinoId, transaction) => {
  const secciones = await SeccionFormato.findAll({
    where: { versionFormatoId: origenId },
    include: [
      { model: CampoFormato, as: 'campos', include: [{ model: OpcionCampo, as: 'opciones' }] },
      { model: ChecklistSeccion, as: 'checklists', include: [{ model: ElementoChecklist, as: 'elementos' }] },
    ],
    order: [['orden', 'ASC']],
    transaction,
  });

  for (const seccionOrigen of secciones) {
    const seccion = await SeccionFormato.create({
      versionFormatoId: destinoId,
      ...copiarAtributos(seccionOrigen, ['nombre', 'descripcion', 'orden', 'estado']),
    }, { transaction });
    for (const campoOrigen of seccionOrigen.campos) {
      const campo = await CampoFormato.create({
        seccionFormatoId: seccion.id,
        ...copiarAtributos(campoOrigen, [
          'parametroCalidadId', 'tipoCampoId', 'unidadMedidaId', 'codigo', 'etiqueta',
          'descripcion', 'textoAyuda', 'esObligatorio', 'orden', 'valorMinimo', 'valorMaximo',
          'precisionDecimal', 'permiteObservacion', 'requiereEvidencia', 'bloquearAlGuardar', 'estado',
        ]),
      }, { transaction });
      if (campoOrigen.opciones.length) {
        await OpcionCampo.bulkCreate(campoOrigen.opciones.map((opcion) => ({
          campoFormatoId: campo.id,
          ...copiarAtributos(opcion, ['valor', 'etiqueta', 'orden', 'estado']),
        })), { transaction });
      }
    }
    for (const checklistOrigen of seccionOrigen.checklists) {
      const checklist = await ChecklistSeccion.create({
        seccionFormatoId: seccion.id,
        ...copiarAtributos(checklistOrigen, [
          'criterioInspeccionId', 'nombre', 'descripcion', 'orden', 'estado',
        ]),
      }, { transaction });
      if (checklistOrigen.elementos.length) {
        await ElementoChecklist.bulkCreate(checklistOrigen.elementos.map((elemento) => ({
          checklistSeccionId: checklist.id,
          ...copiarAtributos(elemento, [
            'elementoInspeccionId', 'codigoSnapshot', 'nombreSnapshot', 'orden', 'estado',
          ]),
        })), { transaction });
      }
    }
  }
};

const crearVersion = async ({ formatoCalidadId, datos, transaction }) => {
  const ultima = await VersionFormato.max('numeroVersion', {
    where: { formatoCalidadId },
    transaction,
  });
  const numeroVersion = datos.numeroVersion ?? Number(ultima || 0) + 1;
  const duplicada = await VersionFormato.findOne({
    where: { formatoCalidadId, numeroVersion },
    transaction,
  });
  if (duplicada) throw new ApiError(`Ya existe la versión ${numeroVersion} para este formato`, 409);

  let origen = null;
  if (datos.modo === 'COPIAR_PUBLICADA') {
    origen = await VersionFormato.findOne({
      where: { formatoCalidadId, estadoVersion: 'PUBLICADO' },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!origen) throw new ApiError('El formato no tiene una versión PUBLICADA para copiar', 409);
  }

  const version = await VersionFormato.create({
    formatoCalidadId,
    numeroVersion,
    fechaVigenciaDesde: datos.fechaVigenciaDesde,
    fechaVigenciaHasta: datos.fechaVigenciaHasta || null,
    observaciones: datos.observaciones || null,
    estadoVersion: 'BORRADOR',
    publicadoPor: null,
    fechaPublicacion: null,
  }, { transaction });
  if (origen) await clonarContenido(origen.id, version.id, transaction);
  return version;
};

const publicarVersion = async ({ versionId, usuarioId, transaction }) => {
  const version = await VersionFormato.findByPk(versionId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!version) throw new ApiError('Versión de formato no encontrada', 404);
  if (version.estadoVersion !== 'BORRADOR') {
    throw new ApiError('Solo una versión en BORRADOR puede publicarse', 409);
  }
  await VersionFormato.update({ estadoVersion: 'OBSOLETO' }, {
    where: {
      formatoCalidadId: version.formatoCalidadId,
      estadoVersion: 'PUBLICADO',
      id: { [Op.ne]: version.id },
    },
    transaction,
  });
  await version.update({
    estadoVersion: 'PUBLICADO',
    publicadoPor: usuarioId,
    fechaPublicacion: new Date(),
  }, { transaction });
  return version;
};

module.exports = { clonarContenido, crearVersion, publicarVersion };
