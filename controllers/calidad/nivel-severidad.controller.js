const { NivelSeveridad } = require('../../models');
const crearCrud = require('./crearCrud');

module.exports = crearCrud({
  modelo: NivelSeveridad,
  nombre: 'Nivel de severidad',
  campoUnico: 'codigo',
  order: [['orden', 'ASC']],
});
