const { Usuario, Rol, Cargo } = require('../models');
const { ok, created, fail } = require('../utils/response');

exports.listar = async (req, res, next) => {
  try {
    const usuarios = await Usuario.findAll({
      include: [
        { model: Rol, as: 'rol' },
        { model: Cargo, as: 'cargo' },
      ],
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
      include: [
        { model: Rol, as: 'rol' },
        { model: Cargo, as: 'cargo' },
      ],
    });
    if (!usuario) return fail(res, 'Usuario no encontrado', 404);
    return ok(res, usuario);
  } catch (err) {
    return next(err);
  }
};

exports.crear = async (req, res, next) => {
  try {
    const { nombre, correo, password, rolId, usuario: identificador, cargoId } = req.body;

    const existente = await Usuario.findOne({ where: { usuario: identificador } });
    if (existente) return fail(res, 'El usuario ya esta registrado', 409);

    const rol = await Rol.findByPk(rolId);
    if (!rol) return fail(res, 'Rol no encontrado', 404);

    if (cargoId && !(await Cargo.findOne({ where: { id: cargoId, estado: true } })))
      return fail(res, 'Cargo inexistente o inactivo', 422);
    const usuario = await Usuario.create({
      nombre,
      correo,
      password,
      rolId,
      usuario: identificador,
      cargoId,
    });
    const creado = await Usuario.findByPk(usuario.id, {
      include: [
        { model: Rol, as: 'rol' },
        { model: Cargo, as: 'cargo' },
      ],
    });
    return created(res, creado);
  } catch (err) {
    return next(err);
  }
};

exports.actualizar = async (req, res, next) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return fail(res, 'Usuario no encontrado', 404);

    const { nombre, correo, password, rolId, usuario: identificador, cargoId, estado } = req.body;

    if (identificador && identificador !== usuario.usuario) {
      const existente = await Usuario.findOne({ where: { usuario: identificador } });
      if (existente) return fail(res, 'El usuario ya esta registrado', 409);
    }
    if (rolId) {
      const rol = await Rol.findByPk(rolId);
      if (!rol) return fail(res, 'Rol no encontrado', 404);
    }

    if (cargoId && !(await Cargo.findOne({ where: { id: cargoId, estado: true } })))
      return fail(res, 'Cargo inexistente o inactivo', 422);
    await usuario.update({
      nombre,
      correo,
      password,
      rolId,
      usuario: identificador,
      cargoId,
      estado,
    });
    const actualizado = await Usuario.findByPk(usuario.id, {
      include: [
        { model: Rol, as: 'rol' },
        { model: Cargo, as: 'cargo' },
      ],
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
