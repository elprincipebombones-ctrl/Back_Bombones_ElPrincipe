const { body, param } = require('express-validator');

exports.crearPermisoValidator = [
  body('nombre').isString().isLength({ min: 2, max: 100 }),
  body('descripcion').optional().isString(),
  body('modulo').optional().isString(),
];

exports.actualizarPermisoValidator = [
  param('id').isUUID(),
  body('nombre').optional().isString(),
  body('descripcion').optional().isString(),
  body('modulo').optional().isString(),
  body('estado').optional().isBoolean(),
];

exports.idValidator = [param('id').isUUID()];
