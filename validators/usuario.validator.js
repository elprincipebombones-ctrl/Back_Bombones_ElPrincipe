const { body, param } = require('express-validator');

exports.crearUsuarioValidator = [
  body('usuario')
    .isString()
    .bail()
    .trim()
    .toLowerCase()
    .matches(/^[a-z0-9._-]{3,100}$/),
  body('cargoId').optional({ nullable: true }).isUUID(),
  body('nombre').isString().isLength({ min: 2, max: 100 }),
  body('correo').isEmail().withMessage('Correo inválido'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password mínimo 8 caracteres')
    .matches(/[A-Z]/)
    .withMessage('Debe contener mayúscula')
    .matches(/[a-z]/)
    .withMessage('Debe contener minúscula')
    .matches(/[0-9]/)
    .withMessage('Debe contener número'),
  body('rolId').isUUID().withMessage('rolId inválido'),
];

exports.actualizarUsuarioValidator = [
  param('id').isUUID(),
  body('usuario')
    .optional()
    .isString()
    .bail()
    .trim()
    .toLowerCase()
    .matches(/^[a-z0-9._-]{3,100}$/),
  body('cargoId').optional({ nullable: true }).isUUID(),
  body('nombre').optional().isString().isLength({ min: 2, max: 100 }),
  body('correo').optional().isEmail(),
  body('password').optional().isLength({ min: 8 }),
  body('rolId').optional().isUUID(),
  body('estado').optional().isBoolean(),
];

exports.idValidator = [param('id').isUUID()];
