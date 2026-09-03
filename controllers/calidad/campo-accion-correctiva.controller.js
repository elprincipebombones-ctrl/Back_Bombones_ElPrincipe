const { CampoAccionCorrectiva } = require('../../models');
const crearCrud = require('./crearCrud');

module.exports = crearCrud({
  modelo: CampoAccionCorrectiva,
  nombre: 'Campo de acción correctiva',
  campoUnico: 'codigo',
  order: [
    ['orden', 'ASC'],
    ['nombre', 'ASC'],
  ],
});
