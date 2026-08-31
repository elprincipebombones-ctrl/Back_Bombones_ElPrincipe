const { sequelize, CategoriaLugarInspeccion, LugarInspeccion } = require('../../models');
const { ok, created } = require('../../utils/response');
const { ApiError } = require('../../utils/ApiError');

const manejarError = (error) => {
  if (error.name === 'SequelizeUniqueConstraintError') {
    return new ApiError('Ya existe una categoría con ese nombre', 409);
  }
  return error;
};

exports.listar = async (req, res, next) => {
  try {
    const where = req.query.solo_activos === 'true' ? { estado: true } : {};
    const categorias = await CategoriaLugarInspeccion.findAll({
      where,
      include: [
        {
          model: LugarInspeccion,
          as: 'lugares',
          separate: true,
          order: [['orden', 'ASC']],
        },
      ],
      order: [['orden', 'ASC']],
    });
    return ok(res, categorias);
  } catch (error) {
    return next(error);
  }
};

exports.obtener = async (req, res, next) => {
  try {
    const categoria = await CategoriaLugarInspeccion.findByPk(req.params.id, {
      include: [{ model: LugarInspeccion, as: 'lugares' }],
    });
    if (!categoria) throw new ApiError('Categoría de lugar no encontrada', 404);
    return ok(res, categoria);
  } catch (error) {
    return next(error);
  }
};

exports.crear = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    await sequelize.query('LOCK TABLE categorias_lugar_inspeccion IN SHARE ROW EXCLUSIVE MODE', {
      transaction,
    });
    const maximo = await CategoriaLugarInspeccion.max('orden', { transaction });
    const categoria = await CategoriaLugarInspeccion.create(
      {
        nombre: req.body.nombre.trim(),
        orden: Number(maximo ?? 0) + 1,
        estado: req.body.estado ?? true,
      },
      { transaction },
    );
    await transaction.commit();
    return created(res, categoria, 'Categoría creada');
  } catch (error) {
    await transaction.rollback();
    return next(manejarError(error));
  }
};

exports.actualizar = async (req, res, next) => {
  try {
    const categoria = await CategoriaLugarInspeccion.findByPk(req.params.id);
    if (!categoria) throw new ApiError('Categoría de lugar no encontrada', 404);
    await categoria.update({
      ...(req.body.nombre !== undefined ? { nombre: req.body.nombre.trim() } : {}),
      ...(req.body.estado !== undefined ? { estado: req.body.estado } : {}),
    });
    return ok(res, categoria, 'Categoría actualizada');
  } catch (error) {
    return next(manejarError(error));
  }
};

exports.eliminar = async (req, res, next) => {
  try {
    const categoria = await CategoriaLugarInspeccion.findByPk(req.params.id);
    if (!categoria) throw new ApiError('Categoría de lugar no encontrada', 404);
    await categoria.update({ estado: false });
    return ok(res, categoria, 'Categoría inactivada');
  } catch (error) {
    return next(error);
  }
};
