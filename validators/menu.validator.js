const { body, param } = require('express-validator');

exports.crearMenuValidator = [
  body('nombre').isString().isLength({ min: 2, max: 100 }),
  body('ruta').isString().isLength({ min: 1, max: 150 }),
  body('icono').optional().isString(),
  body('orden').optional().isInt(),
];

exports.actualizarMenuValidator = [
  param('id').isUUID(),
  body('nombre').optional().isString(),
  body('ruta').optional().isString(),
  body('icono').optional().isString(),
  body('orden').optional().isInt(),
  body('estado').optional().isBoolean(),
];

exports.idValidator = [param('id').isUUID()];
