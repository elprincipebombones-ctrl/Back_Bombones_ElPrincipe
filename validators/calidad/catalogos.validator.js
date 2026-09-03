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
  body('tipoCampoId').isUUID().withMessage('tipoCampoId es obligatorio'),
  body('unidadMedidaId').optional({ nullable: true }).isUUID(),
  body('valorMinimo').optional({ nullable: true }).isNumeric(),
  body('valorMaximo').optional({ nullable: true }).isNumeric(),
  body('precisionDecimal').optional({ nullable: true }).isInt({ min: 0, max: 10 }),
  body('esObligatorioDefault').optional().isBoolean(),
  body('permiteObservacionDefault').optional().isBoolean(),
  body('requiereEvidenciaDefault').optional().isBoolean(),
  body('bloquearAlGuardarDefault').optional().isBoolean(),
  body().custom((valor) => {
    if (
      valor.valorMinimo !== null &&
      valor.valorMinimo !== undefined &&
      valor.valorMaximo !== null &&
      valor.valorMaximo !== undefined &&
      Number(valor.valorMinimo) > Number(valor.valorMaximo)
    ) {
      throw new Error('valorMinimo debe ser menor o igual que valorMaximo');
    }
    return true;
  }),
];
exports.actualizarParametroValidator = [
  param('id').isUUID(),
  ...base(true),
  body('tipoCampoId').optional().isUUID(),
  body('unidadMedidaId').optional({ nullable: true }).isUUID(),
  body('valorMinimo').optional({ nullable: true }).isNumeric(),
  body('valorMaximo').optional({ nullable: true }).isNumeric(),
  body('precisionDecimal').optional({ nullable: true }).isInt({ min: 0, max: 10 }),
  body('esObligatorioDefault').optional().isBoolean(),
  body('permiteObservacionDefault').optional().isBoolean(),
  body('requiereEvidenciaDefault').optional().isBoolean(),
  body('bloquearAlGuardarDefault').optional().isBoolean(),
  body().custom((valor) => {
    if (
      valor.valorMinimo !== null &&
      valor.valorMinimo !== undefined &&
      valor.valorMaximo !== null &&
      valor.valorMaximo !== undefined &&
      Number(valor.valorMinimo) > Number(valor.valorMaximo)
    ) {
      throw new Error('valorMinimo debe ser menor o igual que valorMaximo');
    }
    return true;
  }),
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
