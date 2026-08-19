const { OpcionCampo, CampoFormato } = require('../../models');
const crearCrud = require('./crearCrud');
const { validarCampo } = require('../../services/calidad/inmutabilidad-version.service');

module.exports = crearCrud({
  modelo: OpcionCampo,
  nombre: 'Opción de campo',
  order: [['orden', 'ASC']],
  relaciones: [
    { campo: 'campoFormatoId', modelo: CampoFormato, mensaje: 'Campo de formato no encontrado' },
  ],
  antesDeCrear: (body) => validarCampo(body.campoFormatoId),
  antesDeActualizar: async (opcion, body) =>
    (await validarCampo(opcion.campoFormatoId)) || validarCampo(body.campoFormatoId),
  antesDeEliminar: (opcion) => validarCampo(opcion.campoFormatoId),
});
