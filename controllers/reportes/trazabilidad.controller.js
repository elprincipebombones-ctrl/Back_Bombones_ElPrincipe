const service = require('../../services/reportes/trazabilidad.service');
const { ok } = require('../../utils/response');

exports.buscar = async (req, res, next) => {
  try {
    return ok(res, await service.buscar(req.query));
  } catch (error) {
    next(error);
  }
};

exports.consultar = async (req, res, next) => {
  try {
    return ok(res, await service.consultar(req.query));
  } catch (error) {
    next(error);
  }
};
