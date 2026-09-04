const { VerificacionRecepcion } = require('../../models');
const crearControlador = require('./unoAUnoRecepcion.controller');

module.exports = crearControlador(VerificacionRecepcion, 'Verificación de recepción');
