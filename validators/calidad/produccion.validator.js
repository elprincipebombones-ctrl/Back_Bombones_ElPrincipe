const { body, param } = require('express-validator');

exports.ordenValidator = [param('ordenId').isUUID().withMessage('ordenId debe ser UUID válido')];

exports.iniciarValidator = [
  ...exports.ordenValidator,
  body('formatoId').isUUID().withMessage('Selecciona un formato válido'),
  body('productoId').optional({ nullable: true }).isUUID(),
  body('lote').optional({ nullable: true }).trim().isLength({ max: 100 }),
];
