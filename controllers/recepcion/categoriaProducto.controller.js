const CategoriaProducto = require('../../models/Recepcion/CategoriaProducto');
const { ok, created, fail } = require('../../utils/response');

exports.listar = async (req, res, next) => {
  try {
    const categoriasProductos = await CategoriaProducto.findAll({
      order: [['nombre', 'ASC']],
    });

    return ok(res, categoriasProductos);
  } catch (err) {
    return next(err);
  }
};

exports.obtener = async (req, res, next) => {
  try {
    const categoriaProducto = await CategoriaProducto.findByPk(req.params.id);

    if (!categoriaProducto) {
      return fail(res, 'Categoría de producto no encontrada', 404);
    }

    return ok(res, categoriaProducto);
  } catch (err) {
    return next(err);
  }
};

exports.crear = async (req, res, next) => {
  try {
    const {
      nombre,
      codigo,
      descripcion,
      clasificacionMp,
      requiereLote,
      requiereFechaVencimiento,
      requiereTemperatura,
      estado,
    } = req.body;

    if (!nombre) {
      return fail(res, 'Falta el nombre', 400);
    }

    if (!codigo) {
      return fail(res, 'Falta el código', 400);
    }

    const categoriaExistente = await CategoriaProducto.findOne({
      where: {
        codigo,
      },
    });

    if (categoriaExistente) {
      return fail(res, 'Ya existe una categoría de producto con ese código', 409);
    }

    const categoriaProducto = await CategoriaProducto.create({
      nombre,
      codigo,
      descripcion,
      clasificacionMp,
      requiereLote: requiereLote ?? false,
      requiereFechaVencimiento: requiereFechaVencimiento ?? false,
      requiereTemperatura: requiereTemperatura ?? false,
      estado: estado !== undefined ? estado : true,
    });

    return created(res, categoriaProducto);
  } catch (err) {
    return next(err);
  }
};

exports.actualizar = async (req, res, next) => {
  try {
    const categoriaProducto = await CategoriaProducto.findByPk(req.params.id);

    if (!categoriaProducto) {
      return fail(res, 'Categoría de producto no encontrada', 404);
    }

    if (req.body.codigo && req.body.codigo !== categoriaProducto.codigo) {
      const categoriaExistente = await CategoriaProducto.findOne({
        where: {
          codigo: req.body.codigo,
        },
      });

      if (categoriaExistente && categoriaExistente.id !== categoriaProducto.id) {
        return fail(res, 'Ya existe una categoría de producto con ese código', 409);
      }
    }

    await categoriaProducto.update(req.body);

    return ok(res, categoriaProducto, 'Categoría de producto actualizada');
  } catch (err) {
    return next(err);
  }
};

exports.eliminar = async (req, res, next) => {
  try {
    const categoriaProducto = await CategoriaProducto.findByPk(req.params.id);

    if (!categoriaProducto) {
      return fail(res, 'Categoría de producto no encontrada', 404);
    }

    await categoriaProducto.destroy();

    return ok(res, null, 'Categoría de producto eliminada');
  } catch (err) {
    return next(err);
  }
};
