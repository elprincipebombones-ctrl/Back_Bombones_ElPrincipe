const {
  sequelize,
  Recepcion,
  DetalleRecepcion,
  Producto,
  CategoriaProducto,
  CondicionTermica,
  UnidadMedida,
} = require('../../models');
const { ok, created, fail } = require('../../utils/response');
const { validarDetalles } = require('../../services/recepcion/recepcion.service');

const include = [
  {
    model: Producto,
    as: 'producto',
    include: [
      { model: CategoriaProducto, as: 'categoriaProducto' },
      { model: CondicionTermica, as: 'condicionTermica' },
    ],
  },
  { model: UnidadMedida, as: 'unidadMedida' },
];

const conRecepcionEditable = async (recepcionId, operacion) =>
  sequelize.transaction(async (transaction) => {
    const recepcion = await Recepcion.findByPk(recepcionId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!recepcion) throw Object.assign(new Error('Recepción no encontrada'), { status: 404 });
    if (recepcion.estado !== 'EN_PROCESO')
      throw Object.assign(new Error('La recepción finalizada es de solo lectura'), { status: 409 });
    return operacion(transaction);
  });

const buscarDetalle = (recepcionId, id, transaction) =>
  DetalleRecepcion.findOne({ where: { id, recepcionId }, include, transaction });

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
    const detalle = await conRecepcionEditable(req.params.recepcionId, async (transaction) => {
      const [datos] = await validarDetalles([req.body], transaction);
      const registro = await DetalleRecepcion.create(
        { ...datos, recepcionId: req.params.recepcionId },
        { transaction },
      );
      return buscarDetalle(req.params.recepcionId, registro.id, transaction);
    });
    return created(res, detalle);
  } catch (error) {
    return next(error);
  }
};

exports.actualizar = async (req, res, next) => {
  try {
    const resultado = await conRecepcionEditable(req.params.recepcionId, async (transaction) => {
      const detalle = await buscarDetalle(req.params.recepcionId, req.params.id, transaction);
      if (!detalle)
        throw Object.assign(new Error('Detalle no encontrado en la recepción'), { status: 404 });
      const candidato = {
        bodegaId: req.body.bodegaId ?? detalle.bodegaId,
        productoId: req.body.productoId ?? detalle.productoId,
        unidadMedidaId: req.body.unidadMedidaId ?? detalle.unidadMedidaId,
        cantidadSolicitada:
          req.body.cantidadSolicitada === undefined
            ? detalle.cantidadSolicitada
            : req.body.cantidadSolicitada,
        cantidadRecibida: req.body.cantidadRecibida ?? detalle.cantidadRecibida,
        costoUnitario: req.body.costoUnitario ?? detalle.costoUnitario,
        loteProveedor:
          req.body.loteProveedor === undefined ? detalle.loteProveedor : req.body.loteProveedor,
        fechaVencimiento:
          req.body.fechaVencimiento === undefined
            ? detalle.fechaVencimiento
            : req.body.fechaVencimiento,
        observaciones:
          req.body.observaciones === undefined ? detalle.observaciones : req.body.observaciones,
      };
      const [datos] = await validarDetalles([candidato], transaction);
      await detalle.update(datos, { transaction });
      return buscarDetalle(req.params.recepcionId, detalle.id, transaction);
    });
    return ok(res, resultado, 'Producto de recepción actualizado');
  } catch (err) {
    return next(err);
  }
};

exports.eliminar = async (req, res, next) => {
  try {
    await conRecepcionEditable(req.params.recepcionId, async (transaction) => {
      const detalle = await buscarDetalle(req.params.recepcionId, req.params.id, transaction);
      if (!detalle)
        throw Object.assign(new Error('Detalle no encontrado en la recepción'), { status: 404 });
      await detalle.destroy({ transaction });
    });
    return ok(res, null, 'Producto retirado de la recepción');
  } catch (error) {
    return next(error);
  }
};
