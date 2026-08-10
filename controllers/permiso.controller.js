const { Permiso } = require('../models');
const { ok, created, fail } = require('../utils/response');

exports.listar = async (req, res, next) => {
  try {

    const permisos = await Permiso.findAll({ order: [['modulo', 'ASC'], ['nombre', 'ASC']] });

    return ok(res, permisos);

  } catch (err) {

    return next(err);
    
  }
};

exports.obtener = async (req, res, next) => {
  try {
    const permiso = await Permiso.findByPk(req.params.id);
    if (!permiso) return fail(res, 'Permiso no encontrado', 404);
    return ok(res, permiso);
  } catch (err) {
    return next(err);
  }
};

exports.crear = async (req, res, next) => {
  
  try {
    

    const { nombre, descripcion, modulo } = req.body;

    const existente = await Permiso.findOne({ where: { nombre } });
    // SELECT * FROM permissions WHERE nombre = 'nombre';

    if (existente) 
      return fail(res, 'El permiso ya existe', 409);

    const permiso = await Permiso.create({ nombre, descripcion, modulo });

    return created(res, permiso);

  } catch (err) {

    return next(err);

  }
};

exports.actualizar = async (req, res, next) => {
  try {
    const permiso = await Permiso.findByPk(req.params.id);
    if (!permiso) return fail(res, 'Permiso no encontrado', 404);
    await permiso.update(req.body);
    return ok(res, permiso, 'Permiso actualizado');
  } catch (err) {
    return next(err);
  }
};

exports.eliminar = async (req, res, next) => {
  try {
    const permiso = await Permiso.findByPk(req.params.id);
    if (!permiso) return fail(res, 'Permiso no encontrado', 404);
    await permiso.destroy();
    return ok(res, null, 'Permiso eliminado');
  } catch (err) {
    return next(err);
  }
};
