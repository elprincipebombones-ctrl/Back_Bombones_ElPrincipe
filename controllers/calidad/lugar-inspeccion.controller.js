const { LugarInspeccion } = require('../../models');
const crearCrud = require('./crearCrud');

module.exports = crearCrud({ modelo: LugarInspeccion, nombre: 'Lugar de inspección', campoUnico: 'codigo' });
