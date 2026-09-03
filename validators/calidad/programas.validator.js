const { body, param } = require('express-validator');

exports.idValidator = [param('id').isUUID().withMessage('ID de programa inválido')];
exports.crearValidator = [
  body('nombre').trim().isLength({ min: 2, max: 100 }),
  body('descripcion').optional({ nullable: true }).isString().isLength({ max: 500 }),
  body('estado').optional().isBoolean(),
];
exports.actualizarValidator = [
  param('id').isUUID().withMessage('ID de programa inválido'),
  body('nombre').optional().trim().isLength({ min: 2, max: 100 }),
  body('descripcion').optional({ nullable: true }).isString().isLength({ max: 500 }),
  body('estado').optional().isBoolean(),
];
