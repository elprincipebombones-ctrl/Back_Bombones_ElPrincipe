const { CondicionAmbientalRecepcion } = require('../../models');
const crearControlador = require('./unoAUnoRecepcion.controller');

module.exports = crearControlador(CondicionAmbientalRecepcion, 'Condición ambiental');
