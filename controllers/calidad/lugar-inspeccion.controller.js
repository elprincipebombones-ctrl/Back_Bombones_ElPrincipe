const { sequelize, CategoriaLugarInspeccion, LugarInspeccion } = require('../../models');
const { ok, created } = require('../../utils/response');
const { ApiError } = require('../../utils/ApiError');

const includeCategoria = [{ model: CategoriaLugarInspeccion, as: 'categoria' }];

const manejarError = (error) => {
  if (error.name === 'SequelizeUniqueConstraintError') {
    return new ApiError('Ya existe ese lugar dentro de la categoría', 409);
  }
  return error;
};

exports.listar = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.categoria_id) {
      where.categoriaLugarInspeccionId = req.query.categoria_id;
    }
    if (req.query.solo_activos === 'true') where.estado = true;

    const lugares = await LugarInspeccion.findAll({
      where,
      include: includeCategoria,
      order: [
        [{ model: CategoriaLugarInspeccion, as: 'categoria' }, 'orden', 'ASC'],
        ['orden', 'ASC'],
      ],
    });
    return ok(res, lugares);
  } catch (error) {
    return next(error);
  }
};

exports.obtener = async (req, res, next) => {
  try {
    const lugar = await LugarInspeccion.findByPk(req.params.id, {
      include: includeCategoria,
    });
    if (!lugar) throw new ApiError('Lugar de inspección no encontrado', 404);
    return ok(res, lugar);
  } catch (error) {
    return next(error);
  }
};

exports.crear = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const categoria = await CategoriaLugarInspeccion.findOne({
      where: {
        id: req.body.categoriaLugarInspeccionId,
        estado: true,
      },
      transaction,
    });
    if (!categoria) throw new ApiError('La categoría no existe o está inactiva', 422);

    await sequelize.query('LOCK TABLE lugares_inspeccion IN SHARE ROW EXCLUSIVE MODE', {
      transaction,
    });
    const maximo = await LugarInspeccion.max('orden', {
      where: { categoriaLugarInspeccionId: categoria.id },
      transaction,
    });
    const lugar = await LugarInspeccion.create(
      {
        nombre: req.body.nombre.trim(),
        categoriaLugarInspeccionId: categoria.id,
        orden: Number(maximo ?? 0) + 1,
        estado: req.body.estado ?? true,
      },
      { transaction },
    );
    await transaction.commit();
    return created(res, lugar, 'Lugar de inspección creado');
  } catch (error) {
    await transaction.rollback();
    return next(manejarError(error));
  }
};

exports.actualizar = async (req, res, next) => {
  try {
    const lugar = await LugarInspeccion.findByPk(req.params.id, {
      include: includeCategoria,
    });
    if (!lugar) throw new ApiError('Lugar de inspección no encontrado', 404);
    if (req.body.estado === true && !lugar.categoria?.estado) {
      throw new ApiError('Activa primero la categoría del lugar', 409);
    }
    await lugar.update({
      ...(req.body.nombre !== undefined ? { nombre: req.body.nombre.trim() } : {}),
      ...(req.body.estado !== undefined ? { estado: req.body.estado } : {}),
    });
    return ok(res, lugar, 'Lugar de inspección actualizado');
  } catch (error) {
    return next(manejarError(error));
  }
};

exports.eliminar = async (req, res, next) => {
  try {
    const lugar = await LugarInspeccion.findByPk(req.params.id);
    if (!lugar) throw new ApiError('Lugar de inspección no encontrado', 404);
    await lugar.update({ estado: false });
    return ok(res, lugar, 'Lugar de inspección inactivado');
  } catch (error) {
    return next(error);
  }
};
