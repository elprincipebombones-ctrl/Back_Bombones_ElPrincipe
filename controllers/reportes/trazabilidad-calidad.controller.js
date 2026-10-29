const calidad = require('../../services/reportes/trazabilidad-calidad.service');
const exportaciones = require('../../services/reportes/exportaciones.service');
const { ok } = require('../../utils/response');

exports.consultar = async (req, res, next) => {
  try {
    return ok(res, await calidad.consultar(req.query));
  } catch (error) {
    next(error);
  }
};

exports.catalogos = async (_req, res, next) => {
  try {
    return ok(res, await calidad.catalogos());
  } catch (error) {
    next(error);
  }
};

const descargar = (generar) => async (req, res, next) => {
  try {
    const { buffer, nombre } = await generar(req.query, req.usuario);
    res.set('Cache-Control', 'no-store');
    res.set('Content-Disposition', `attachment; filename="${nombre}"`);
    return res.type('application/pdf').send(buffer);
  } catch (error) {
    next(error);
  }
};

exports.pdfCalidad = descargar(exportaciones.exportarCalidad);
exports.pdfProducto = descargar(exportaciones.exportarProducto);
