const { body, param } = require('express-validator');

exports.crearRolValidator = [
  body('nombre').isString().isLength({ min: 2, max: 50 }),
  body('descripcion').optional().isString().isLength({ max: 255 }),
  body('permisos').optional().isArray(),
  body('menus').optional().isArray(),
];

exports.actualizarRolValidator = [
  param('id').isUUID(),
  body('nombre').optional().isString().isLength({ min: 2, max: 50 }),
  body('descripcion').optional().isString().isLength({ max: 255 }),
  body('estado').optional().isBoolean(),
  body('permisos').optional().isArray(),
  body('menus').optional().isArray(),
];

exports.idValidator = [param('id').isUUID()];
