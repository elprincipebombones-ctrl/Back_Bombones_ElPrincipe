const {
  Recepcion,
  DetalleRecepcion,
  Producto,
  CategoriaProducto,
  UnidadMedida,
} = require('../../models');
const { ok, created, fail } = require('../../utils/response');
const { validarDetalles } = require('../../services/recepcion/recepcion.service');

const include = [
  {
    model: Producto,
    as: 'producto',
    include: [{ model: CategoriaProducto, as: 'categoriaProducto' }],
  },
  { model: UnidadMedida, as: 'unidadMedida' },
];

const recepcionEditable = async (recepcionId) => {
  const recepcion = await Recepcion.findByPk(recepcionId);
  if (!recepcion) return { error: 'Recepción no encontrada', status: 404 };
  if (recepcion.estado !== 'EN_PROCESO') {
    return { error: 'La recepción finalizada es de solo lectura', status: 409 };
  }
  return { recepcion };
};

const buscarDetalle = (recepcionId, id) =>
  DetalleRecepcion.findOne({ where: { id, recepcionId }, include });

exports.listar = async (req, res, next) => {
  try {
    const recepcion = await Recepcion.findByPk(req.params.recepcionId);
    if (!recepcion) return fail(res, 'Recepción no encontrada', 404);
    const detalles = await DetalleRecepcion.findAll({
      where: { recepcionId: req.params.recepcionId },
      include,
      order: [['createdAt', 'ASC']],
    });
    return ok(res, detalles);
  } catch (err) {
    return next(err);
  }
};

exports.obtener = async (req, res, next) => {
  try {
    const detalle = await buscarDetalle(req.params.recepcionId, req.params.id);
    return detalle ? ok(res, detalle) : fail(res, 'Detalle no encontrado en la recepción', 404);
  } catch (err) {
    return next(err);
  }
};

exports.crear = async (req, res, next) => {
  try {
    const estado = await recepcionEditable(req.params.recepcionId);
    if (estado.error) return fail(res, estado.error, estado.status);
    const [datos] = await validarDetalles([req.body]);
    const detalle = await DetalleRecepcion.create({
      ...datos,
      recepcionId: req.params.recepcionId,
    });
    return created(res, await buscarDetalle(req.params.recepcionId, detalle.id));
  } catch (err) {
    return next(err);
  }
};

exports.actualizar = async (req, res, next) => {
  try {
    const estado = await recepcionEditable(req.params.recepcionId);
    if (estado.error) return fail(res, estado.error, estado.status);
    const detalle = await buscarDetalle(req.params.recepcionId, req.params.id);
    if (!detalle) return fail(res, 'Detalle no encontrado en la recepción', 404);
    const candidato = {
      productoId: req.body.productoId ?? detalle.productoId,
      unidadMedidaId: req.body.unidadMedidaId ?? detalle.unidadMedidaId,
      cantidadSolicitada:
        req.body.cantidadSolicitada === undefined
          ? detalle.cantidadSolicitada
          : req.body.cantidadSolicitada,
      cantidadRecibida: req.body.cantidadRecibida ?? detalle.cantidadRecibida,
      loteProveedor:
        req.body.loteProveedor === undefined ? detalle.loteProveedor : req.body.loteProveedor,
      fechaVencimiento:
        req.body.fechaVencimiento === undefined
          ? detalle.fechaVencimiento
          : req.body.fechaVencimiento,
      observaciones:
        req.body.observaciones === undefined ? detalle.observaciones : req.body.observaciones,
    };
    const [datos] = await validarDetalles([candidato]);
    await detalle.update(datos);
    return ok(
      res,
      await buscarDetalle(req.params.recepcionId, detalle.id),
      'Producto de recepción actualizado',
    );
  } catch (err) {
    return next(err);
  }
};

exports.eliminar = async (req, res, next) => {
  try {
    const estado = await recepcionEditable(req.params.recepcionId);
    if (estado.error) return fail(res, estado.error, estado.status);
    const detalle = await buscarDetalle(req.params.recepcionId, req.params.id);
    if (!detalle) return fail(res, 'Detalle no encontrado en la recepción', 404);
    await detalle.destroy();
    return ok(res, null, 'Producto retirado de la recepción');
  } catch (err) {
    return next(err);
  }
};
