const { Menu } = require('../models');
const { ok, created, fail } = require('../utils/response');

exports.listar = async (req, res, next) => {
  try {
    const menus = await Menu.findAll({ order: [['orden', 'ASC']] });
    return ok(res, menus);
  } catch (err) {
    return next(err);
  }
};

exports.obtener = async (req, res, next) => {
  try {
    const menu = await Menu.findByPk(req.params.id);
    if (!menu) return fail(res, 'Menú no encontrado', 404);
    return ok(res, menu);
  } catch (err) {
    return next(err);
  }
};

exports.crear = async (req, res, next) => {
  try {
    const menu = await Menu.create(req.body);
    return created(res, menu);
  } catch (err) {
    return next(err);
  }
};

exports.actualizar = async (req, res, next) => {
  try {
    const menu = await Menu.findByPk(req.params.id);
    if (!menu) return fail(res, 'Menú no encontrado', 404);
    await menu.update(req.body);
    return ok(res, menu, 'Menú actualizado');
  } catch (err) {
    return next(err);
  }
};

exports.eliminar = async (req, res, next) => {
  try {
    const menu = await Menu.findByPk(req.params.id);
    if (!menu) return fail(res, 'Menú no encontrado', 404);
    await menu.destroy();
    return ok(res, null, 'Menú eliminado');
  } catch (err) {
    return next(err);
  }
};
