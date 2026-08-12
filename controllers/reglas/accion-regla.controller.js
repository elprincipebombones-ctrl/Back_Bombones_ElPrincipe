const { AccionRegla, ReglaCalidad, TipoAccion } = require('../../models');
const crearCrud = require('../calidad/crearCrud');

module.exports = crearCrud({
  modelo: AccionRegla,
  nombre: 'Acción de regla',
  order: [['orden', 'ASC']],
  include: [{ model: TipoAccion, as: 'tipoAccion' }],
  relaciones: [
    { campo: 'reglaCalidadId', modelo: ReglaCalidad, mensaje: 'Regla de calidad no encontrada' },
    { campo: 'tipoAccionId', modelo: TipoAccion, mensaje: 'Tipo de acción no encontrado' },
  ],
});
