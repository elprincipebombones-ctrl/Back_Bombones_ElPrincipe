const { fail } = require('../utils/response');

// Requiere que el usuario tenga al menos uno de los permisos indicados
module.exports = (...permisosRequeridos) => {
  return (req, res, next) => {
    if (!req.permisos) return fail(res, 'No autenticado', 401);
    const tiene = permisosRequeridos.some((p) => req.permisos.includes(p));
    if (!tiene) return fail(res, 'No tienes permisos para realizar esta acción', 403);
    next();
  };
};
