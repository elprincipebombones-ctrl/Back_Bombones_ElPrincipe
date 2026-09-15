const { body, param } = require('express-validator');

exports.loginValidator = [
  body('usuario')
    .isString()
    .bail()
    .trim()
    .toLowerCase()
    .matches(/^[a-z0-9._-]{3,100}$/)
    .withMessage('Usuario inv?lido'),
  body('password').notEmpty().withMessage('Password requerido'),
];

exports.refreshValidator = [body('refreshToken').notEmpty().withMessage('refreshToken requerido')];

exports.uuidParam = [param('id').isUUID().withMessage('ID inválido (UUID)')];
