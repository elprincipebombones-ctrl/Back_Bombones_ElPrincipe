const { fail } = require('../utils/response');

// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  console.error('[ERROR]', err);
  if (err.name === 'SequelizeUniqueConstraintError') {
    return fail(res, 'Ya existe un registro con esos datos únicos', 409, err.errors || null);
  }
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return fail(res, 'La relación indicada no existe o el registro está en uso', 409);
  }
  if (err.name === 'SequelizeValidationError') {
    return fail(res, 'Datos inválidos', 422, err.errors || null);
  }
  const status = err.status || 500;
  const message = err.message || 'Error interno del servidor';
  return fail(res, message, status, err.errors || null);
};
