const { OpcionCampo, CampoFormato } = require('../../models');
const crearCrud = require('./crearCrud');

module.exports = crearCrud({
  modelo: OpcionCampo,
  nombre: 'Opción de campo',
  order: [['orden', 'ASC']],
  relaciones: [
    { campo: 'campoFormatoId', modelo: CampoFormato, mensaje: 'Campo de formato no encontrado' },
  ],
});
