const { AccionCriterio, CriterioInspeccion, TipoAccion } = require('../../models');
const crearCrud = require('./crearCrud');

module.exports = crearCrud({
  modelo: AccionCriterio,
  nombre: 'Acción de criterio',
  include: [
    { model: CriterioInspeccion, as: 'criterio' },
    { model: TipoAccion, as: 'tipoAccion' },
  ],
  order: [['orden', 'ASC']],
  relaciones: [
    { campo: 'criterioInspeccionId', modelo: CriterioInspeccion, mensaje: 'Criterio no encontrado' },
    { campo: 'tipoAccionId', modelo: TipoAccion, mensaje: 'Tipo de acción no encontrado' },
  ],
});
