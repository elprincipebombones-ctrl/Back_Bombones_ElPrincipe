const { validationResult } = require('express-validator');
const { fail } = require('../utils/response');

module.exports = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return fail(res, 'Errores de validación', 422, errors.array());
  }
  next();
};
