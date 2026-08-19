const { TipoAccion } = require('../../models');
const crearCrud = require('./crearCrud');

module.exports = crearCrud({ modelo: TipoAccion, nombre: 'Tipo de acción', campoUnico: 'codigo' });
