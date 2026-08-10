const { body, param } = require('express-validator');

exports.loginValidator = [
  body('correo').isEmail().withMessage('Correo inválido'),
  body('password').notEmpty().withMessage('Password requerido'),
];

exports.refreshValidator = [
  body('refreshToken').notEmpty().withMessage('refreshToken requerido'),
];

exports.uuidParam = [param('id').isUUID().withMessage('ID inválido (UUID)')];
