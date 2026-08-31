const { body, param } = require('express-validator');

const camposConfiguracion = [
  param('id').isUUID(),
  body('campos').isArray(),
  body('campos.*.campoAccionCorrectivaId').isUUID(),
  body('campos.*.orden').optional().isInt({ min: 0 }),
  body('campos.*.obligatorioOverride').optional({ nullable: true }).isBoolean(),
  body('campos').custom((campos) => {
    const ids = campos.map((campo) => campo.campoAccionCorrectivaId);
    if (new Set(ids).size !== ids.length) throw new Error('No se permiten campos duplicados');
    return true;
  }),
];

exports.idValidator = [param('id').isUUID()];
exports.crearCampoValidator = [
  body('codigo')
    .trim()
    .isLength({ min: 2, max: 80 })
    .matches(/^[A-Z0-9_-]+$/),
  body('nombre').trim().isLength({ min: 2, max: 200 }),
  body('descripcion').optional({ nullable: true }).isString().isLength({ max: 500 }),
  body('obligatorio').optional().isBoolean(),
  body('orden').optional().isInt({ min: 0 }),
  body('estado').optional().isBoolean(),
];
exports.actualizarCampoValidator = [
  param('id').isUUID(),
  body('codigo')
    .optional()
    .trim()
    .isLength({ min: 2, max: 80 })
    .matches(/^[A-Z0-9_-]+$/),
  body('nombre').optional().trim().isLength({ min: 2, max: 200 }),
  body('descripcion').optional({ nullable: true }).isString().isLength({ max: 500 }),
  body('obligatorio').optional().isBoolean(),
  body('orden').optional().isInt({ min: 0 }),
  body('estado').optional().isBoolean(),
];
exports.configurarValidator = camposConfiguracion;
exports.guardarValoresValidator = [
  param('id').isUUID(),
  body('campos').isArray(),
  body('campos.*.id').isUUID(),
  body('campos.*.valorTexto').optional({ nullable: true }).isString(),
  body('campos').custom((campos) => {
    const ids = campos.map((campo) => campo.id);
    if (new Set(ids).size !== ids.length) throw new Error('No se permiten campos duplicados');
    return true;
  }),
];
