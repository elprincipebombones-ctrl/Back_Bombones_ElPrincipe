const { SeccionFormato, VersionFormato } = require('../../models');
const crearCrud = require('./crearCrud');

module.exports = crearCrud({
  modelo: SeccionFormato,
  nombre: 'Sección de formato',
  order: [['orden', 'ASC']],
  relaciones: [
    { campo: 'versionFormatoId', modelo: VersionFormato, mensaje: 'Versión de formato no encontrada' },
  ],
  antesDeActualizar: async (seccion) => {
    const version = await VersionFormato.findByPk(seccion.versionFormatoId);
    return version?.estadoVersion === 'PUBLICADO'
      ? 'No se puede modificar una sección de una versión publicada'
      : null;
  },
});
