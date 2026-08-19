const { CondicionRegla, ReglaCalidad } = require('../../models');
const crearCrud = require('../calidad/crearCrud');
const { validarRegla } = require('../../services/calidad/inmutabilidad-version.service');

module.exports = crearCrud({
  modelo: CondicionRegla,
  nombre: 'Condición de regla',
  order: [['orden', 'ASC']],
  relaciones: [
    { campo: 'reglaCalidadId', modelo: ReglaCalidad, mensaje: 'Regla de calidad no encontrada' },
  ],
  antesDeCrear: (body) => validarRegla(body.reglaCalidadId),
  antesDeActualizar: async (condicion, body) =>
    (await validarRegla(condicion.reglaCalidadId)) || validarRegla(body.reglaCalidadId),
  antesDeEliminar: (condicion) => validarRegla(condicion.reglaCalidadId),
});
