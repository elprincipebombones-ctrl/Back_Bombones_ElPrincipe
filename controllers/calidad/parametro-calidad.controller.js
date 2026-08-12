const { ParametroCalidad, UnidadMedida } = require('../../models');
const crearCrud = require('./crearCrud');

module.exports = crearCrud({
  modelo: ParametroCalidad,
  nombre: 'Parámetro de calidad',
  campoUnico: 'codigo',
  include: [{ model: UnidadMedida, as: 'unidadMedida' }],
  relaciones: [
    { campo: 'unidadMedidaId', modelo: UnidadMedida, mensaje: 'Unidad de medida no encontrada' },
  ],
});
