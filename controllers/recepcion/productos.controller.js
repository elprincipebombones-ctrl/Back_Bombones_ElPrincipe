const { Op } = require('sequelize');
const Producto = require('../../models/Recepcion/Producto');
const CategoriaProducto = require('../../models/Recepcion/CategoriaProducto');
const UnidadMedida = require('../../models/Recepcion/UnidadMedida');
const { ok, created, fail } = require('../../utils/response');

const include = [
  {
    model: CategoriaProducto,
    as: 'categoriaProducto',
    attributes: ['id', 'codigo', 'nombre', 'descripcion', 'clasificacionMp', 'estado'],
  },
  {
    model: UnidadMedida,
    as: 'unidadMedida',
    attributes: ['id', 'codigo', 'nombre', 'simbolo', 'estado'],
  },
];

exports.listar = async (req, res, next) => {
  try {
    const search = String(req.query.search || '').trim();
    const where = search
      ? {
          [Op.or]: [
            { codigo: { [Op.iLike]: `%${search}%` } },
            { nombre: { [Op.iLike]: `%${search}%` } },
          ],
        }
      : undefined;
    const productos = await Producto.findAll({ where, include, order: [['nombre', 'ASC']] });
    return ok(res, productos);
  } catch (err) {
    return next(err);
  }
};

exports.obtener = async (req, res, next) => {
  try {
    const producto = await Producto.findByPk(req.params.id, { include });
    return producto ? ok(res, producto) : fail(res, 'Producto no encontrado', 404);
  } catch (err) {
    return next(err);
  }
};

const validarRelaciones = async (categoriaProductoId, unidadMedidaId) => {
  const [categoria, unidad] = await Promise.all([
    CategoriaProducto.findByPk(categoriaProductoId),
    UnidadMedida.findByPk(unidadMedidaId),
  ]);
  if (!categoria || !categoria.estado) return 'La categoría no existe o está inactiva';
  if (!unidad || !unidad.estado) return 'La unidad de medida no existe o está inactiva';
  return null;
};

exports.crear = async (req, res, next) => {
  try {
    const { codigo, nombre, descripcion, categoriaProductoId, unidadMedidaId, estado } = req.body;
    const error = await validarRelaciones(categoriaProductoId, unidadMedidaId);
    if (error) return fail(res, error, 422);
    const producto = await Producto.create({
      codigo,
      nombre,
      descripcion,
      categoriaProductoId,
      unidadMedidaId,
      estado: estado ?? true,
    });
    return created(res, await Producto.findByPk(producto.id, { include }));
  } catch (err) {
    return next(err);
  }
};

exports.actualizar = async (req, res, next) => {
  try {
    const producto = await Producto.findByPk(req.params.id);
    if (!producto) return fail(res, 'Producto no encontrado', 404);
    const categoriaProductoId = req.body.categoriaProductoId ?? producto.categoriaProductoId;
    const unidadMedidaId = req.body.unidadMedidaId ?? producto.unidadMedidaId;
    const error = await validarRelaciones(categoriaProductoId, unidadMedidaId);
    if (error) return fail(res, error, 422);
    await producto.update(req.body);
    return ok(res, await Producto.findByPk(producto.id, { include }), 'Producto actualizado');
  } catch (err) {
    return next(err);
  }
};

exports.eliminar = async (req, res, next) => {
  try {
    const producto = await Producto.findByPk(req.params.id);
    if (!producto) return fail(res, 'Producto no encontrado', 404);
    await producto.destroy();
    return ok(res, null, 'Producto eliminado');
  } catch (err) {
    return next(err);
  }
};
