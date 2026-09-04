const { ResultadoRecepcion } = require('../../models');
const crearControlador = require('./unoAUnoRecepcion.controller');

module.exports = crearControlador(ResultadoRecepcion, 'Resultado de recepción');
