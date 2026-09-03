const { query } = require('express-validator');

exports.resumenValidator = [
  query('fecha')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('La fecha debe tener formato YYYY-MM-DD')
    .bail()
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage('La fecha no es válida'),
];
