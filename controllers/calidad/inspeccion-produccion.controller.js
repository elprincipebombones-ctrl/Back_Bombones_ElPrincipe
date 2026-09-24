const { sequelize } = require('../../models');
const { created, ok } = require('../../utils/response');
const {
  formatosPublicados,
  iniciar,
  listarInspecciones,
  obtenerContexto,
} = require('../../services/calidad/inspecciones-produccion.service');

exports.formatos = async (_req, res, next) => {
  try {
    return ok(res, await formatosPublicados());
  } catch (error) {
    return next(error);
  }
};

exports.contexto = async (req, res, next) => {
  try {
    return ok(res, await obtenerContexto(req.params.ordenId));
  } catch (error) {
    return next(error);
  }
};

exports.inspecciones = async (req, res, next) => {
  try {
    return ok(res, await listarInspecciones(req.params.ordenId));
  } catch (error) {
    return next(error);
  }
};

exports.iniciar = async (req, res, next) => {
  try {
    const inspeccion = await sequelize.transaction((transaction) =>
      iniciar({
        ordenId: req.params.ordenId,
        formatoId: req.body.formatoId,
        productoId: req.body.productoId || null,
        lote: req.body.lote || null,
        usuarioId: req.usuario.id,
        transaction,
      }),
    );
    return created(res, inspeccion, 'Inspección de producción iniciada');
  } catch (error) {
    return next(error);
  }
};
