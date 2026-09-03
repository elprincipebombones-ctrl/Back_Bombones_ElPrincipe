const { TipoInspeccion } = require('../../models');
const crearCrud = require('./crearCrud');

module.exports = crearCrud({
  modelo: TipoInspeccion,
  nombre: 'Tipo de inspección',
  campoUnico: 'codigo',
});
