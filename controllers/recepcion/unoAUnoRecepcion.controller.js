const { Recepcion } = require('../../models');
const { ok, created, fail } = require('../../utils/response');

module.exports = (Modelo, nombre) => ({
  async obtener(req, res, next) {
    try {
      const registro = await Modelo.findOne({ where: { recepcionId: req.params.recepcionId } });
      return registro ? ok(res, registro) : fail(res, `${nombre} no encontrado`, 404);
    } catch (err) {
      return next(err);
    }
  },

  async crear(req, res, next) {
    try {
      const recepcion = await Recepcion.findByPk(req.params.recepcionId);
      if (!recepcion) return fail(res, 'Recepción no encontrada', 404);
      if (recepcion.estado !== 'EN_PROCESO') {
        return fail(res, 'La recepción finalizada es de solo lectura', 409);
      }
      const existente = await Modelo.findOne({ where: { recepcionId: recepcion.id } });
      if (existente) return fail(res, `La recepción ya tiene ${nombre.toLowerCase()}`, 409);
      const registro = await Modelo.create({ ...req.body, recepcionId: recepcion.id });
      return created(res, registro);
    } catch (err) {
      return next(err);
    }
  },

  async actualizar(req, res, next) {
    try {
      const recepcion = await Recepcion.findByPk(req.params.recepcionId);
      if (!recepcion) return fail(res, 'Recepción no encontrada', 404);
      if (recepcion.estado !== 'EN_PROCESO') {
        return fail(res, 'La recepción finalizada es de solo lectura', 409);
      }
      const registro = await Modelo.findOne({ where: { recepcionId: recepcion.id } });
      if (!registro) return fail(res, `${nombre} no encontrado`, 404);
      await registro.update(req.body);
      return ok(res, registro, `${nombre} actualizado`);
    } catch (err) {
      return next(err);
    }
  },

  async eliminar(req, res, next) {
    try {
      const recepcion = await Recepcion.findByPk(req.params.recepcionId);
      if (!recepcion) return fail(res, 'Recepción no encontrada', 404);
      if (recepcion.estado !== 'EN_PROCESO') {
        return fail(res, 'La recepción finalizada es de solo lectura', 409);
      }
      const registro = await Modelo.findOne({ where: { recepcionId: recepcion.id } });
      if (!registro) return fail(res, `${nombre} no encontrado`, 404);
      await registro.destroy();
      return ok(res, null, `${nombre} eliminado`);
    } catch (err) {
      return next(err);
    }
  },
});
