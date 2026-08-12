const { TipoCampo } = require('../../models');
const crearCrud = require('./crearCrud');

module.exports = crearCrud({ modelo: TipoCampo, nombre: 'Tipo de campo', campoUnico: 'codigo' });
