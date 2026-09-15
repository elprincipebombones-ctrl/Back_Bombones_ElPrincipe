const {
  AccionCorrectiva,
  EvidenciaAccionCorrectiva,
  sequelize,
  TareaAccionCorrectiva,
  Usuario,
} = require('../../models');
const { ApiError } = require('../../utils/ApiError');
const { created, ok } = require('../../utils/response');
const {
  presentarTarea,
  validarTareaCompletable,
} = require('../../services/calidad/tareas-accion-correctiva.service');

const include = [
  { model: Usuario, as: 'usuarioAsignado', attributes: ['id', 'nombre', 'correo'] },
  { model: EvidenciaAccionCorrectiva, as: 'evidencias' },
];

exports.usuariosActivos = async (_req, res, next) => {
  try {
    const usuarios = await Usuario.findAll({
      where: { estado: true },
      attributes: ['id', 'nombre', 'correo'],
      order: [['nombre', 'ASC']],
    });
    return ok(res, usuarios);
  } catch (error) {
    return next(error);
  }
};

exports.guardar = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const accion = await AccionCorrectiva.findByPk(req.params.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!accion) throw new ApiError('Acción correctiva no encontrada', 404);
    if (!['PENDIENTE', 'EN_PROCESO'].includes(accion.estado)) {
      throw new ApiError('La tarea no puede modificarse después de enviar a aprobación', 409);
    }

    const usuarioAsignadoId = req.body.usuarioAsignadoId ?? req.body.usuario_asignado_id;
    const usuario = await Usuario.findOne({
      where: { id: usuarioAsignadoId, estado: true },
      transaction,
    });
    if (!usuario) throw new ApiError('Selecciona un responsable activo', 422);

    let tarea = await TareaAccionCorrectiva.findOne({
      where: { accionCorrectivaId: accion.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (tarea?.estado === 'COMPLETADA') {
      throw new ApiError('La tarea completada queda en modo consulta', 409);
    }

    const valores = {
      usuarioAsignadoId,
      fechaLimite: req.body.fechaLimite ?? req.body.fecha_limite,
      descripcion: req.body.descripcion.trim(),
      documentacion: req.body.documentacion?.trim() || null,
    };
    const esNueva = !tarea;
    if (esNueva) {
      tarea = await TareaAccionCorrectiva.create(
        { accionCorrectivaId: accion.id, ...valores },
        { transaction },
      );
    } else {
      await tarea.update(valores, { transaction });
    }

    await transaction.commit();
    tarea = await TareaAccionCorrectiva.findByPk(tarea.id, { include });
    return esNueva
      ? created(res, presentarTarea(tarea), 'Tarea asignada')
      : ok(res, presentarTarea(tarea), 'Documentación de la tarea guardada');
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    return next(error);
  }
};

exports.completar = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const accion = await AccionCorrectiva.findByPk(req.params.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!accion) throw new ApiError('Acción correctiva no encontrada', 404);
    if (!['PENDIENTE', 'EN_PROCESO'].includes(accion.estado)) {
      throw new ApiError('La acción ya no permite completar la tarea', 409);
    }
    const tarea = await TareaAccionCorrectiva.findOne({
      where: { accionCorrectivaId: accion.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!tarea) throw new ApiError('La acción no tiene una tarea asignada', 404);
    if (tarea.estado === 'COMPLETADA') throw new ApiError('La tarea ya está completada', 409);

    await validarTareaCompletable(tarea, transaction);
    await tarea.update({ estado: 'COMPLETADA', fechaCompletada: new Date() }, { transaction });
    await transaction.commit();

    const completada = await TareaAccionCorrectiva.findByPk(tarea.id, { include });
    return ok(res, presentarTarea(completada), 'Tarea completada');
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    return next(error);
  }
};
