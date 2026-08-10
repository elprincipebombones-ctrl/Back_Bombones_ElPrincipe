const { fail } = require('../utils/response');

// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  console.error('[ERROR]', err);
  const status = err.status || 500;
  const message = err.message || 'Error interno del servidor';
  return fail(res, message, status, err.errors || null);
};
