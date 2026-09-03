const { SeccionFormato, VersionFormato } = require('../../models');
const crearCrud = require('./crearCrud');
const { validarVersion } = require('../../services/calidad/inmutabilidad-version.service');

module.exports = crearCrud({
  modelo: SeccionFormato,
  nombre: 'Sección de formato',
  order: [['orden', 'ASC']],
  relaciones: [
    {
      campo: 'versionFormatoId',
      modelo: VersionFormato,
      mensaje: 'Versión de formato no encontrada',
    },
  ],
  antesDeCrear: (body) => validarVersion(body.versionFormatoId),
  antesDeActualizar: async (seccion, body) => {
    const errorDestino = await validarVersion(body.versionFormatoId);
    if (errorDestino) return errorDestino;
    const version = await VersionFormato.findByPk(seccion.versionFormatoId);
    return version?.estadoVersion === 'PUBLICADO'
      ? 'No se puede modificar una sección de una versión publicada'
      : null;
  },
  antesDeEliminar: (seccion) => validarVersion(seccion.versionFormatoId),
});
