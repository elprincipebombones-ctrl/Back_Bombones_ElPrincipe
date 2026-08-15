const Producto  = require('../../models/Recepcion/Producto');
const { ok, created, fail } = require('../../utils/response');

exports.listar = async (req, res, next) => {
  try {
    const productos = await Producto.findAll({
      order: [['nombre', 'ASC']]
    });

    return ok(res, productos);
  } catch (err) {
    return next(err);
  }
};

exports.obtener = async (req, res, next) => {
  try {
    const producto = await Producto.findByPk(req.params.id);

    if (!producto) {
      return fail(res, 'Producto no encontrado', 404);
    }

    return ok(res, producto);
  } catch (err) {
    return next(err);
  }
};

exports.crear = async (req, res, next) => {
  try {
    const producto = await Producto.create(req.body);

    return created(res, producto);
  } catch (err) {
    return next(err);
  }
};

exports.actualizar = async (req, res, next) => {
  try {
    const producto = await Producto.findByPk(req.params.id);

    if (!producto) {
      return fail(res, 'Producto no encontrado', 404);
    }

    await producto.update(req.body);

    return ok(res, producto, 'Producto actualizado');
  } catch (err) {
    return next(err);
  }
};

exports.eliminar = async (req, res, next) => {
  try {
    const producto = await Producto.findByPk(req.params.id);

    if (!producto) {
      return fail(res, 'Producto no encontrado', 404);
    }

    await producto.destroy();

    return ok(res, null, 'Producto eliminado');
  } catch (err) {
    return next(err);
  }
};