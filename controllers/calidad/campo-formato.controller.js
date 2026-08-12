const {
  CampoFormato,
  SeccionFormato,
  VersionFormato,
  ParametroCalidad,
  TipoCampo,
  UnidadMedida,
} = require('../../models');
const crearCrud = require('./crearCrud');

module.exports = crearCrud({
  modelo: CampoFormato,
  nombre: 'Campo de formato',
  order: [['orden', 'ASC']],
  include: [
    { model: ParametroCalidad, as: 'parametro' },
    { model: TipoCampo, as: 'tipoCampo' },
    { model: UnidadMedida, as: 'unidadMedida' },
  ],
  relaciones: [
    { campo: 'seccionFormatoId', modelo: SeccionFormato, mensaje: 'Sección no encontrada' },
    { campo: 'parametroCalidadId', modelo: ParametroCalidad, mensaje: 'Parámetro no encontrado' },
    { campo: 'tipoCampoId', modelo: TipoCampo, mensaje: 'Tipo de campo no encontrado' },
    { campo: 'unidadMedidaId', modelo: UnidadMedida, mensaje: 'Unidad de medida no encontrada' },
  ],
  antesDeActualizar: async (campo) => {
    const seccion = await SeccionFormato.findByPk(campo.seccionFormatoId, {
      include: [{ model: VersionFormato, as: 'version' }],
    });
    return seccion?.version?.estadoVersion === 'PUBLICADO'
      ? 'No se puede modificar un campo de una versión publicada'
      : null;
  },
});
