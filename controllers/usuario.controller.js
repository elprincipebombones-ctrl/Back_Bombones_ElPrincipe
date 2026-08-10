const { Usuario, Rol } = require('../models');
const { ok, created, fail } = require('../utils/response');

exports.listar = async (req, res, next) => {
  try {
    const usuarios = await Usuario.findAll({
      include: [{ model: Rol, as: 'rol' }],
      order: [['createdAt', 'DESC']],
    });
    return ok(res, usuarios);
  } catch (err) {
    return next(err);
  }
};

exports.obtener = async (req, res, next) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id, {
      include: [{ model: Rol, as: 'rol' }],
    });
    if (!usuario) return fail(res, 'Usuario no encontrado', 404);
    return ok(res, usuario);
  } catch (err) {
    return next(err);
  }
};

exports.crear = async (req, res, next) => {
  try {
    const { nombre, correo, password, rolId } = req.body;

    const existente = await Usuario.findOne({ where: { correo } });
    if (existente) return fail(res, 'El correo ya está registrado', 409);

    const rol = await Rol.findByPk(rolId);
    if (!rol) return fail(res, 'Rol no encontrado', 404);

    const usuario = await Usuario.create({ nombre, correo, password, rolId });
    const creado = await Usuario.findByPk(usuario.id, { include: [{ model: Rol, as: 'rol' }] });
    return created(res, creado);
  } catch (err) {
    return next(err);
  }
};

exports.actualizar = async (req, res, next) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return fail(res, 'Usuario no encontrado', 404);

    const { nombre, correo, password, rolId, estado } = req.body;

    if (correo && correo !== usuario.correo) {
      const existente = await Usuario.findOne({ where: { correo } });
      if (existente) return fail(res, 'El correo ya está registrado', 409);
    }
    if (rolId) {
      const rol = await Rol.findByPk(rolId);
      if (!rol) return fail(res, 'Rol no encontrado', 404);
    }

    await usuario.update({ nombre, correo, password, rolId, estado });
    const actualizado = await Usuario.findByPk(usuario.id, {
      include: [{ model: Rol, as: 'rol' }],
    });
    return ok(res, actualizado, 'Usuario actualizado');
  } catch (err) {
    return next(err);
  }
};

exports.eliminar = async (req, res, next) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return fail(res, 'Usuario no encontrado', 404);
    await usuario.destroy();
    return ok(res, null, 'Usuario eliminado');
  } catch (err) {
    return next(err);
  }
};
