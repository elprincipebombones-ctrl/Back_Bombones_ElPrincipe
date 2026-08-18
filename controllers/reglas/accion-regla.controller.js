const { AccionRegla, ReglaCalidad, TipoAccion } = require('../../models');
const crearCrud = require('../calidad/crearCrud');
const { validarRegla } = require('../../services/calidad/inmutabilidad-version.service');

module.exports = crearCrud({
  modelo: AccionRegla,
  nombre: 'Acción de regla',
  order: [['orden', 'ASC']],
  include: [{ model: TipoAccion, as: 'tipoAccion' }],
  relaciones: [
    { campo: 'reglaCalidadId', modelo: ReglaCalidad, mensaje: 'Regla de calidad no encontrada' },
    { campo: 'tipoAccionId', modelo: TipoAccion, mensaje: 'Tipo de acción no encontrado' },
  ],
  antesDeCrear: (body) => validarRegla(body.reglaCalidadId),
  antesDeActualizar: async (accion, body) =>
    (await validarRegla(accion.reglaCalidadId)) || validarRegla(body.reglaCalidadId),
  antesDeEliminar: (accion) => validarRegla(accion.reglaCalidadId),
});
