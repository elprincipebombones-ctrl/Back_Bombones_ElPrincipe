const { fail } = require('../utils/response');

module.exports = (...rolesPermitidos) => (req, res, next) => {
  const nombreRol = req.usuario?.rol?.nombre;
  if (!nombreRol) return fail(res, 'No autenticado', 401);
  if (!rolesPermitidos.includes(nombreRol)) {
    return fail(res, 'Rol no autorizado', 403);
  }
  next();
};
