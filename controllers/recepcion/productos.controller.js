const Producto = require('../../models/Recepcion/Producto');
const CategoriaProducto = require('../../models/Recepcion/CategoriaProducto');

const { ok, created, fail } = require('../../utils/response');

exports.listar = async (req, res, next) => {
  try {
    const productos = await Producto.findAll({
      include: [
        {
          model: CategoriaProducto,
          as: 'categoriaProducto',
          attributes: [
            'id',
            'codigo',
            'nombre',
            'descripcion',
            'estado'
          ]
        }
      ],
      order: [['nombre', 'ASC']]
    });

    return ok(res, productos);
  } catch (err) {
    return next(err);
  }
};

exports.obtener = async (req, res, next) => {
  try {
    const producto = await Producto.findByPk(req.params.id, {
      include: [
        {
          model: CategoriaProducto,
          as: 'categoriaProducto',
          attributes: [
            'id',
            'codigo',
            'nombre',
            'descripcion',
            'estado'
          ]
        }
      ]
    });

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
    const {
      codigo,
      nombre,
      descripcion,
      categoriaProductoId,
      unidadMedida,
      estado
    } = req.body;

    if (!codigo) {
      return fail(res, 'Falta el código', 400);
    }

    if (!nombre) {
      return fail(res, 'Falta el nombre', 400);
    }

    if (!categoriaProductoId) {
      return fail(
        res,
        'Debe seleccionar una categoría de producto',
        400
      );
    }

    if (!unidadMedida) {
      return fail(
        res,
        'Falta la unidad de medida',
        400
      );
    }

    const categoriaProducto = await CategoriaProducto.findByPk(
      categoriaProductoId
    );

    if (!categoriaProducto) {
      return fail(
        res,
        'La categoría de producto seleccionada no existe',
        404
      );
    }

    if (!categoriaProducto.estado) {
      return fail(
        res,
        'La categoría de producto seleccionada está inactiva',
        400
      );
    }

    const producto = await Producto.create({
      codigo,
      nombre,
      descripcion,
      categoriaProductoId,
      unidadMedida,
      estado
    });

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

    if (req.body.categoriaProductoId) {
      const categoriaProducto =
        await CategoriaProducto.findByPk(
          req.body.categoriaProductoId
        );

      if (!categoriaProducto) {
        return fail(
          res,
          'La categoría de producto seleccionada no existe',
          404
        );
      }

      if (!categoriaProducto.estado) {
        return fail(
          res,
          'La categoría de producto seleccionada está inactiva',
          400
        );
      }
    }

    await producto.update(req.body);

    return ok(
      res,
      producto,
      'Producto actualizado'
    );
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

    return ok(
      res,
      null,
      'Producto eliminado'
    );
  } catch (err) {
    return next(err);
  }
};