const { body, param } = require('express-validator');

const codigo = (opcional = false) => {
  let regla = body('codigo');
  if (opcional) regla = regla.optional();
  return regla
    .trim()
    .isLength({ min: 2, max: 30 })
    .matches(/^[A-Z0-9_-]+$/)
    .withMessage('El código debe usar mayúsculas, números, guion o guion bajo');
};
const nombre = (opcional = false) => {
  let regla = body('nombre');
  if (opcional) regla = regla.optional();
  return regla.trim().isLength({ min: 2, max: 100 });
};
const base = (opcional = false) => [
  codigo(opcional),
  nombre(opcional),
  body('descripcion').optional({ nullable: true }).isString().isLength({ max: 255 }),
  body('estado').optional().isBoolean(),
];

exports.idValidator = [param('id').isUUID().withMessage('ID inválido')];
exports.crearCatalogoValidator = base(false);
exports.actualizarCatalogoValidator = [param('id').isUUID(), ...base(true)];
exports.crearUnidadValidator = [
  ...base(false),
  body('simbolo').trim().isLength({ min: 1, max: 20 }),
];
exports.actualizarUnidadValidator = [
  param('id').isUUID(),
  ...base(true),
  body('simbolo').optional().trim().isLength({ min: 1, max: 20 }),
];
exports.crearParametroValidator = [
  ...base(false),
  body('unidadMedidaId').optional({ nullable: true }).isUUID(),
];
exports.actualizarParametroValidator = [
  param('id').isUUID(),
  ...base(true),
  body('unidadMedidaId').optional({ nullable: true }).isUUID(),
];
exports.crearTipoCampoValidator = [
  ...base(false),
  body('permiteOpciones').optional().isBoolean(),
  body('permiteUnidad').optional().isBoolean(),
];
exports.actualizarTipoCampoValidator = [
  param('id').isUUID(),
  ...base(true),
  body('permiteOpciones').optional().isBoolean(),
  body('permiteUnidad').optional().isBoolean(),
];
exports.crearNivelValidator = [...base(false), body('orden').optional().isInt({ min: 0 })];
exports.actualizarNivelValidator = [
  param('id').isUUID(),
  ...base(true),
  body('orden').optional().isInt({ min: 0 }),
];
