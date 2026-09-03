const { ok } = require('../../utils/response');
const { obtenerResumen } = require('../../services/calidad/dashboard-calidad.service');

exports.resumen = async (req, res, next) => {
  try {
    const resumen = await obtenerResumen(req.query.fecha);
    return ok(res, resumen, 'Resumen de Calidad');
  } catch (error) {
    return next(error);
  }
};
