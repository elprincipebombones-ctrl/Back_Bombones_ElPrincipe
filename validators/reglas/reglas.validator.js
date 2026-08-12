const { body, param } = require('express-validator');

const id = (campo, opcional = false, nullable = false) => {
  let regla = body(campo);
  if (opcional) regla = regla.optional({ nullable });
  return regla.isUUID();
};
const codigo = (opcional = false) => {
  let regla = body('codigo');
  if (opcional) regla = regla.optional();
  return regla.trim().isLength({ min: 2, max: 30 }).matches(/^[A-Z0-9_-]+$/);
};
const regla = (opcional = false) => [
  id('campoFormatoId', opcional),
  codigo(opcional),
  body('nombre')[opcional ? 'optional' : 'exists']().trim().isLength({ min: 2, max: 100 }),
  body('descripcion').optional({ nullable: true }).isLength({ max: 255 }),
  id('nivelSeveridadId', true, true),
  body('mensajeIncumplimiento').optional({ nullable: true }).isLength({ max: 255 }),
  body('operadorLogico').optional().isIn(['AND', 'OR']),
  body('estado').optional().isBoolean(),
];
const condicion = (opcional = false) => [
  id('reglaCalidadId', opcional),
  body('tipoCondicion')[opcional ? 'optional' : 'exists']().isIn([
    'RANGO', 'VALOR_EXACTO', 'LISTA', 'OBLIGATORIO',
  ]),
  body('operador')[opcional ? 'optional' : 'exists']().isIn([
    'IGUAL', 'DIFERENTE', 'MAYOR_QUE', 'MAYOR_IGUAL', 'MENOR_QUE', 'MENOR_IGUAL',
    'ENTRE', 'FUERA_DE_RANGO', 'EN_LISTA', 'NO_EN_LISTA', 'VACIO', 'NO_VACIO',
  ]),
  body('valor1').optional({ nullable: true }).isString().isLength({ max: 255 }),
  body('valor2').optional({ nullable: true }).isString().isLength({ max: 255 }),
  body('valorJson').optional({ nullable: true }),
  body('orden').optional().isInt({ min: 0 }),
  body('estado').optional().isBoolean(),
];
const accion = (opcional = false) => [
  id('reglaCalidadId', opcional),
  id('tipoAccionId', opcional),
  body('configuracion').optional({ nullable: true }).isObject(),
  body('orden').optional().isInt({ min: 0 }),
  body('estado').optional().isBoolean(),
];

exports.idValidator = [param('id').isUUID()];
exports.crearReglaValidator = regla(false);
exports.actualizarReglaValidator = [param('id').isUUID(), ...regla(true)];
exports.crearCondicionValidator = condicion(false);
exports.actualizarCondicionValidator = [param('id').isUUID(), ...condicion(true)];
exports.crearAccionValidator = accion(false);
exports.actualizarAccionValidator = [param('id').isUUID(), ...accion(true)];
