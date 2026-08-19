const { UnidadMedida } = require('../../models');
const crearCrud = require('./crearCrud');

module.exports = crearCrud({ modelo: UnidadMedida, nombre: 'Unidad de medida', campoUnico: 'codigo' });
