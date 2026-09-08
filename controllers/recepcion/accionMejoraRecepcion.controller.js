const { Recepcion, AccionMejoraRecepcion, DetalleRecepcion, Producto } = require('../../models');
const { ok, fail } = require('../../utils/response');

const recepcionEditable = async (recepcionId) => {
  const recepcion = await Recepcion.findByPk(recepcionId);
  if (!recepcion) return { error: 'Recepción no encontrada', status: 404 };
  if (recepcion.estado !== 'EN_PROCESO') {
    return { error: 'La recepción finalizada es de solo lectura', status: 409 };
  }
  return { recepcion };
};

exports.listar = async (req, res, next) => {
  try {
    const recepcion = await Recepcion.findByPk(req.params.recepcionId);
    if (!recepcion) return fail(res, 'Recepción no encontrada', 404);
    const acciones = await AccionMejoraRecepcion.findAll({
      where: { recepcionId: recepcion.id },
      include: [
        {
          model: DetalleRecepcion,
          as: 'detalleRecepcion',
          include: [{ model: Producto, as: 'producto' }],
        },
      ],
      order: [['createdAt', 'ASC']],
    });
    return ok(res, acciones);
  } catch (error) {
    return next(error);
  }
};

exports.actualizar = async (req, res, next) => {
  try {
    const estadoRecepcion = await recepcionEditable(req.params.recepcionId);
    if (estadoRecepcion.error) {
      return fail(res, estadoRecepcion.error, estadoRecepcion.status);
    }

    const accion = await AccionMejoraRecepcion.findOne({
      where: {
        id: req.params.id,
        recepcionId: req.params.recepcionId,
      },
    });
    if (!accion) return fail(res, 'Acción de mejora no encontrada', 404);

    await accion.update({
      observacion: req.body.observacion.trim(),
      decision: req.body.decision,
      estado: 'GESTIONADA',
    });
    return ok(res, accion, 'Acción de mejora gestionada');
  } catch (error) {
    return next(error);
  }
};
