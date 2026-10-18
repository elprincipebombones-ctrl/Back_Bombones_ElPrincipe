const { ok } = require('../../utils/response');
const service = require('../../services/trazabilidad/informe-trazabilidad.service');
const pdf = require('../../services/trazabilidad/informe-trazabilidad-pdf.service');

exports.listar = async (req, res, next) => {
  try {
    return ok(res, await service.buscarLotes(req.query), 'Lotes de producto terminado');
  } catch (error) {
    return next(error);
  }
};

exports.obtener = async (req, res, next) => {
  try {
    return ok(res, await service.obtenerInforme(req.params.lote, req.query), 'Informe de trazabilidad');
  } catch (error) {
    return next(error);
  }
};

exports.descargarPdf = async (req, res, next) => {
  try {
    const informe = await service.obtenerInforme(req.params.lote, req.query);
    const contenido = await pdf.construirPdf(informe);
    const seguro = req.params.lote.replace(/[^A-Za-z0-9_.-]/g, '_');
    res.type('application/pdf');
    res.attachment(`trazabilidad-${seguro}.pdf`);
    return res.send(contenido);
  } catch (error) {
    return next(error);
  }
};

exports.obtenerInversa = async (req, res, next) => {
  try {
    return ok(
      res,
      await service.obtenerTrazabilidadInversa(
        req.params.productoId,
        req.params.lote,
        req.query,
      ),
      'Informe de trazabilidad inversa',
    );
  } catch (error) {
    return next(error);
  }
};
