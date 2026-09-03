const { Op } = require('sequelize');
const { ok, created, fail } = require('../../utils/response');

module.exports = ({
  modelo,
  nombre,
  include = [],
  order = [['created_at', 'DESC']],
  campoUnico,
  relaciones = [],
  bajaLogica = true,
  antesDeCrear,
  antesDeActualizar,
  antesDeEliminar,
}) => {
  const comprobarRelaciones = async (body) => {
    for (const relacion of relaciones) {
      const valor = body[relacion.campo];
      if (valor === undefined || valor === null) continue;
      if (!(await relacion.modelo.findByPk(valor))) return relacion.mensaje;
    }
    return null;
  };

  const listar = async (_req, res, next) => {
    try {
      return ok(res, await modelo.findAll({ include, order }));
    } catch (error) {
      return next(error);
    }
  };

  const obtener = async (req, res, next) => {
    try {
      const registro = await modelo.findByPk(req.params.id, { include });
      if (!registro) return fail(res, `${nombre} no encontrado`, 404);
      return ok(res, registro);
    } catch (error) {
      return next(error);
    }
  };

  const crear = async (req, res, next) => {
    try {
      if (antesDeCrear) {
        const mensaje = await antesDeCrear(req.body);
        if (mensaje) return fail(res, mensaje, 409);
      }
      if (campoUnico && req.body[campoUnico]) {
        const existe = await modelo.findOne({ where: { [campoUnico]: req.body[campoUnico] } });
        if (existe)
          return fail(res, `Ya existe ${nombre.toLowerCase()} con ese ${campoUnico}`, 409);
      }
      const errorRelacion = await comprobarRelaciones(req.body);
      if (errorRelacion) return fail(res, errorRelacion, 422);
      return created(res, await modelo.create(req.body));
    } catch (error) {
      return next(error);
    }
  };

  const actualizar = async (req, res, next) => {
    try {
      const registro = await modelo.findByPk(req.params.id);
      if (!registro) return fail(res, `${nombre} no encontrado`, 404);
      if (antesDeActualizar) {
        const mensaje = await antesDeActualizar(registro, req.body);
        if (mensaje) return fail(res, mensaje, 409);
      }
      if (campoUnico && req.body[campoUnico]) {
        const existe = await modelo.findOne({
          where: { [campoUnico]: req.body[campoUnico], id: { [Op.ne]: registro.id } },
        });
        if (existe)
          return fail(res, `Ya existe ${nombre.toLowerCase()} con ese ${campoUnico}`, 409);
      }
      const errorRelacion = await comprobarRelaciones(req.body);
      if (errorRelacion) return fail(res, errorRelacion, 422);
      await registro.update(req.body);
      return ok(res, registro, `${nombre} actualizado`);
    } catch (error) {
      return next(error);
    }
  };

  const eliminar = async (req, res, next) => {
    try {
      const registro = await modelo.findByPk(req.params.id);
      if (!registro) return fail(res, `${nombre} no encontrado`, 404);
      if (antesDeEliminar) {
        const mensaje = await antesDeEliminar(registro);
        if (mensaje) return fail(res, mensaje, 409);
      }
      if (bajaLogica && Object.prototype.hasOwnProperty.call(modelo.rawAttributes, 'estado')) {
        await registro.update({ estado: false });
        return ok(res, registro, `${nombre} desactivado`);
      }
      await registro.destroy();
      return ok(res, null, `${nombre} eliminado`);
    } catch (error) {
      if (error.name === 'SequelizeForeignKeyConstraintError') {
        return fail(res, `${nombre} tiene registros relacionados y no se puede eliminar`, 409);
      }
      return next(error);
    }
  };

  return { listar, obtener, crear, actualizar, eliminar };
};
