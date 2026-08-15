const  Proveedor  = require('../../models/Recepcion/Proveedor');
const { ok, created, fail } = require('../../utils/response');

exports.listar = async (req, res, next) => {
  try {
    const proveedores = await Proveedor.findAll({
      order: [['razonSocial', 'ASC']]
    });

    return ok(res, proveedores);
  } catch (err) {
    return next(err);
  }
};

exports.obtener = async (req, res, next) => {
  try {
    const proveedor = await Proveedor.findByPk(req.params.id);

    if (!proveedor) {
      return fail(res, 'Proveedor no encontrado', 404);
    }

    return ok(res, proveedor);
  } catch (err) {
    return next(err);
  }
};

exports.crear = async (req, res, next) => {
  try {
    const proveedor = await Proveedor.create(req.body);

    return created(res, proveedor);
  } catch (err) {
    return next(err);
  }
};

exports.actualizar = async (req, res, next) => {
  try {
    const proveedor = await Proveedor.findByPk(req.params.id);

    if (!proveedor) {
      return fail(res, 'Proveedor no encontrado', 404);
    }

    await proveedor.update(req.body);

    return ok(res, proveedor, 'Proveedor actualizado');
  } catch (err) {
    return next(err);
  }
};

exports.eliminar = async (req, res, next) => {
  try {
    const proveedor = await Proveedor.findByPk(req.params.id);

    if (!proveedor) {
      return fail(res, 'Proveedor no encontrado', 404);
    }

    await proveedor.destroy();

    return ok(res, null, 'Proveedor eliminado');
  } catch (err) {
    return next(err);
  }
};