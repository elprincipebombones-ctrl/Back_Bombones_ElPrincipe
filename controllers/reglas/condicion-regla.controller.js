const { CondicionRegla, ReglaCalidad } = require('../../models');
const crearCrud = require('../calidad/crearCrud');

module.exports = crearCrud({
  modelo: CondicionRegla,
  nombre: 'Condición de regla',
  order: [['orden', 'ASC']],
  relaciones: [
    { campo: 'reglaCalidadId', modelo: ReglaCalidad, mensaje: 'Regla de calidad no encontrada' },
  ],
});
