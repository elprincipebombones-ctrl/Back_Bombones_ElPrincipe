const { Op } = require('sequelize');
const {
  Desviacion,
  ReglaCalidad,
  NivelSeveridad,
  RespuestaInspeccion,
  AccionCorrectiva,
  TipoAccion,
} = require('../../models');
const { ok, fail } = require('../../utils/response');

const include = [
  { model: ReglaCalidad, as: 'regla' },
  { model: NivelSeveridad, as: 'nivelSeveridad' },
  { model: RespuestaInspeccion, as: 'respuesta' },
  {
    model: AccionCorrectiva,
    as: 'accionesCorrectivas',
    include: [{ model: TipoAccion, as: 'tipoAccion' }],
  },
];

exports.listar = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.estado) where.estado = req.query.estado;
    if (req.query.inspeccion_id) where.inspeccionId = req.query.inspeccion_id;
    return ok(res, await Desviacion.findAll({ where, include, order: [['fechaDeteccion', 'DESC']] }));
  } catch (error) {
    return next(error);
  }
};

exports.obtener = async (req, res, next) => {
  try {
    const desviacion = await Desviacion.findByPk(req.params.id, { include });
    if (!desviacion) return fail(res, 'Desviación no encontrada', 404);
    return ok(res, desviacion);
  } catch (error) {
    return next(error);
  }
};

exports.actualizar = async (req, res, next) => {
  try {
    const desviacion = await Desviacion.findByPk(req.params.id);
    if (!desviacion) return fail(res, 'Desviación no encontrada', 404);
    if (desviacion.estado === 'CERRADA') return fail(res, 'No se puede editar una desviación cerrada', 409);
    await desviacion.update({
      ...(req.body.descripcion !== undefined ? { descripcion: req.body.descripcion } : {}),
      ...(req.body.estado === 'EN_TRATAMIENTO' ? { estado: 'EN_TRATAMIENTO' } : {}),
    });
    return ok(res, desviacion, 'Desviación actualizada');
  } catch (error) {
    return next(error);
  }
};

exports.cerrar = async (req, res, next) => {
  try {
    const desviacion = await Desviacion.findByPk(req.params.id);
    if (!desviacion) return fail(res, 'Desviación no encontrada', 404);
    if (desviacion.estado === 'CERRADA') return fail(res, 'La desviación ya está cerrada', 409);
    const abiertas = await AccionCorrectiva.count({
      where: { desviacionId: desviacion.id, estado: { [Op.ne]: 'CERRADA' } },
    });
    if (abiertas) return fail(res, 'Existen acciones correctivas pendientes por cerrar', 409, { abiertas });
    await desviacion.update({ estado: 'CERRADA', fechaCierre: new Date(), cerradaPor: req.usuario.id });
    return ok(res, desviacion, 'Desviación cerrada');
  } catch (error) {
    return next(error);
  }
};
