const { Op } = require('sequelize');
const { AprobadorAccionCorrectiva, Usuario, Rol } = require('../../models');
const { ok, created, fail } = require('../../utils/response');

const include = [
  {
    model: Usuario,
    as: 'usuario',
    attributes: ['id', 'nombre', 'correo', 'estado'],
    include: [{ model: Rol, as: 'rol', attributes: ['id', 'nombre'] }],
  },
  { model: Usuario, as: 'agregadoPorUsuario', attributes: ['id', 'nombre', 'correo'] },
];

exports.listar = async (_req, res, next) => {
  try {
    const aprobadores = await AprobadorAccionCorrectiva.findAll({
      include,
      order: [[{ model: Usuario, as: 'usuario' }, 'nombre', 'ASC']],
    });
    return ok(res, aprobadores);
  } catch (error) {
    return next(error);
  }
};

exports.usuariosDisponibles = async (_req, res, next) => {
  try {
    const asignados = await AprobadorAccionCorrectiva.findAll({ attributes: ['usuarioId'] });
    const ids = asignados.map((registro) => registro.usuarioId);
    const where = { estado: true };
    if (ids.length) where.id = { [Op.notIn]: ids };
    const usuarios = await Usuario.findAll({
      where,
      attributes: ['id', 'nombre', 'correo', 'estado'],
      include: [{ model: Rol, as: 'rol', attributes: ['id', 'nombre'] }],
      order: [['nombre', 'ASC']],
    });
    return ok(res, usuarios);
  } catch (error) {
    return next(error);
  }
};

exports.crear = async (req, res, next) => {
  try {
    const usuarioId = req.body.usuarioId ?? req.body.usuario_id;
    const usuario = await Usuario.findOne({ where: { id: usuarioId, estado: true } });
    if (!usuario) return fail(res, 'Selecciona un usuario activo del sistema', 422);
    const existente = await AprobadorAccionCorrectiva.findOne({ where: { usuarioId } });
    if (existente) return fail(res, 'El usuario ya está autorizado para aprobar acciones', 409);
    const registro = await AprobadorAccionCorrectiva.create({
      usuarioId,
      agregadoPor: req.usuario.id,
      estado: true,
    });
    return created(
      res,
      await AprobadorAccionCorrectiva.findByPk(registro.id, { include }),
      'Usuario autorizado para aprobar y cerrar acciones correctivas',
    );
  } catch (error) {
    return next(error);
  }
};

exports.eliminar = async (req, res, next) => {
  try {
    const registro = await AprobadorAccionCorrectiva.findByPk(req.params.id);
    if (!registro) return fail(res, 'Aprobador no encontrado', 404);
    const totalActivos = await AprobadorAccionCorrectiva.count({ where: { estado: true } });
    if (registro.estado && totalActivos <= 1) {
      return fail(res, 'Debe existir al menos un aprobador. Agrega otro usuario antes de retirar este.', 409);
    }
    await registro.destroy();
    return ok(res, null, 'Autorización retirada');
  } catch (error) {
    return next(error);
  }
};
