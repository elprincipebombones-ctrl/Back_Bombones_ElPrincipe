const { Op } = require('sequelize');
const {
  AccionCorrectiva,
  Desviacion,
  TipoAccion,
  Usuario,
  SeguimientoAccionCorrectiva,
  EvidenciaAccionCorrectiva,
} = require('../../models');
const { ok, fail } = require('../../utils/response');
const { ApiError } = require('../../utils/ApiError');

const include = [
  { model: TipoAccion, as: 'tipoAccion' },
  { model: Usuario, as: 'responsable', attributes: ['id', 'nombre', 'correo'] },
  { model: SeguimientoAccionCorrectiva, as: 'seguimientos' },
  { model: EvidenciaAccionCorrectiva, as: 'evidencias' },
  { model: Desviacion, as: 'desviacion' },
];

exports.listar = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.estado) where.estado = req.query.estado;
    if (req.query.responsable_id) where.responsableId = req.query.responsable_id;
    return ok(res, await AccionCorrectiva.findAll({ where, include, order: [['fechaAsignacion', 'DESC']] }));
  } catch (error) {
    return next(error);
  }
};

exports.obtener = async (req, res, next) => {
  try {
    const accion = await AccionCorrectiva.findByPk(req.params.id, { include });
    if (!accion) return fail(res, 'Acción correctiva no encontrada', 404);
    return ok(res, accion);
  } catch (error) {
    return next(error);
  }
};

exports.actualizar = async (req, res, next) => {
  try {
    const accion = await AccionCorrectiva.findByPk(req.params.id);
    if (!accion) return fail(res, 'Acción correctiva no encontrada', 404);
    if (accion.estado === 'CERRADA') return fail(res, 'No se puede editar una acción cerrada', 409);
    const responsableId = req.body.responsableId ?? req.body.responsable_id;
    if (responsableId && !(await Usuario.findByPk(responsableId))) {
      return fail(res, 'Usuario responsable no encontrado', 422);
    }
    await accion.update({
      ...(req.body.descripcion !== undefined ? { descripcion: req.body.descripcion } : {}),
      ...(responsableId !== undefined ? { responsableId } : {}),
      ...((req.body.fechaLimite ?? req.body.fecha_limite) !== undefined
        ? { fechaLimite: req.body.fechaLimite ?? req.body.fecha_limite }
        : {}),
    });
    return ok(res, accion, 'Acción correctiva actualizada');
  } catch (error) {
    return next(error);
  }
};

exports.iniciarAccion = async (req, res, next) => {
  try {
    const accion = await AccionCorrectiva.findByPk(req.params.id, {
      include: [{ model: Desviacion, as: 'desviacion' }],
    });
    if (!accion) return fail(res, 'Acción correctiva no encontrada', 404);
    if (accion.estado !== 'PENDIENTE') return fail(res, 'La acción no está pendiente', 409);
    await accion.update({ estado: 'EN_PROCESO', fechaInicio: new Date() });
    if (accion.desviacion.estado === 'ABIERTA') {
      await accion.desviacion.update({ estado: 'EN_TRATAMIENTO' });
    }
    return ok(res, accion, 'Acción correctiva iniciada');
  } catch (error) {
    return next(error);
  }
};

exports.cerrarAccion = async (req, res, next) => {
  try {
    const accion = await AccionCorrectiva.findByPk(req.params.id, {
      include: [{ model: TipoAccion, as: 'tipoAccion' }],
    });
    if (!accion) throw new ApiError('Acción correctiva no encontrada', 404);
    if (accion.estado === 'CERRADA') throw new ApiError('La acción ya está cerrada', 409);

    if (accion.tipoAccion.codigo === 'EXIGIR_EVIDENCIA') {
      const evidencias = await EvidenciaAccionCorrectiva.count({
        where: { accionCorrectivaId: accion.id },
      });
      if (!evidencias) throw new ApiError('Esta acción requiere al menos una evidencia', 409);
    }
    if (accion.tipoAccion.codigo === 'SOLICITAR_ACCION_CORRECTIVA') {
      const medicionesCumplen = await SeguimientoAccionCorrectiva.count({
        where: {
          accionCorrectivaId: accion.id,
          tipoRegistro: 'NUEVA_MEDICION',
          resultadoCumple: true,
        },
      });
      if (!medicionesCumplen) {
        throw new ApiError('Esta acción requiere una nueva medición con resultado conforme', 409);
      }
    }
    await accion.update({
      estado: 'CERRADA',
      fechaCierre: new Date(),
      cerradaPor: req.usuario.id,
      observacionCierre: req.body.observacion_cierre ?? req.body.observacionCierre ?? null,
    });
    return ok(res, accion, 'Acción correctiva cerrada');
  } catch (error) {
    return next(error);
  }
};

exports.resumenAbiertas = async (inspeccionId) =>
  AccionCorrectiva.count({
    where: { estado: { [Op.ne]: 'CERRADA' } },
    include: [{ model: Desviacion, as: 'desviacion', where: { inspeccionId }, attributes: [] }],
  });
