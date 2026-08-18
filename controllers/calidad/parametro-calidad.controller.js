const {
  ParametroCalidad,
  UnidadMedida,
  TipoCampo,
  ReglaCalidad,
  NivelSeveridad,
  CondicionRegla,
  AccionRegla,
  TipoAccion,
} = require('../../models');
const crearCrud = require('./crearCrud');

module.exports = crearCrud({
  modelo: ParametroCalidad,
  nombre: 'Parámetro de calidad',
  campoUnico: 'codigo',
  include: [
    { model: UnidadMedida, as: 'unidadMedida' },
    { model: TipoCampo, as: 'tipoCampo' },
    {
      model: ReglaCalidad,
      as: 'reglas',
      include: [
        { model: NivelSeveridad, as: 'nivelSeveridad' },
        { model: CondicionRegla, as: 'condiciones' },
        { model: AccionRegla, as: 'acciones', include: [{ model: TipoAccion, as: 'tipoAccion' }] },
      ],
    },
  ],
  relaciones: [
    { campo: 'unidadMedidaId', modelo: UnidadMedida, mensaje: 'Unidad de medida no encontrada' },
    { campo: 'tipoCampoId', modelo: TipoCampo, mensaje: 'Tipo de campo no encontrado' },
  ],
});
