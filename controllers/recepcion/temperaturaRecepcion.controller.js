const { Recepcion, DetalleRecepcion, TemperaturaRecepcion, Producto } = require('../../models');
const { ok, created, fail } = require('../../utils/response');

const include = [{ model: Producto, as: 'producto' }];
const buscar = (recepcionId, id) =>
  TemperaturaRecepcion.findOne({ where: { id, recepcionId }, include });

const editable = async (recepcionId) => {
  const recepcion = await Recepcion.findByPk(recepcionId);
  if (!recepcion) return { error: 'Recepción no encontrada', status: 404 };
  if (recepcion.estado === 'TERMINADA') {
    return { error: 'Una recepción terminada es de solo lectura', status: 409 };
  }
  return { recepcion };
};

const productoPertenece = (recepcionId, productoId) =>
  DetalleRecepcion.findOne({ where: { recepcionId, productoId } });

exports.listar = async (req, res, next) => {
  try {
    const recepcion = await Recepcion.findByPk(req.params.recepcionId);
    if (!recepcion) return fail(res, 'Recepción no encontrada', 404);
    return ok(
      res,
      await TemperaturaRecepcion.findAll({
        where: { recepcionId: recepcion.id },
        include,
        order: [['createdAt', 'ASC']],
      }),
    );
  } catch (err) {
    return next(err);
  }
};

exports.obtener = async (req, res, next) => {
  try {
    const registro = await buscar(req.params.recepcionId, req.params.id);
    return registro ? ok(res, registro) : fail(res, 'Temperatura no encontrada', 404);
  } catch (err) {
    return next(err);
  }
};

exports.crear = async (req, res, next) => {
  try {
    const estado = await editable(req.params.recepcionId);
    if (estado.error) return fail(res, estado.error, estado.status);
    if (!(await productoPertenece(req.params.recepcionId, req.body.productoId))) {
      return fail(res, 'El producto no pertenece a la recepción', 422);
    }
    const registro = await TemperaturaRecepcion.create({
      ...req.body,
      recepcionId: req.params.recepcionId,
    });
    return created(res, await buscar(req.params.recepcionId, registro.id));
  } catch (err) {
    return next(err);
  }
};

exports.actualizar = async (req, res, next) => {
  try {
    const estado = await editable(req.params.recepcionId);
    if (estado.error) return fail(res, estado.error, estado.status);
    const registro = await buscar(req.params.recepcionId, req.params.id);
    if (!registro) return fail(res, 'Temperatura no encontrada', 404);
    if (
      req.body.productoId &&
      !(await productoPertenece(req.params.recepcionId, req.body.productoId))
    ) {
      return fail(res, 'El producto no pertenece a la recepción', 422);
    }
    await registro.update(req.body);
    return ok(res, await buscar(req.params.recepcionId, registro.id), 'Temperatura actualizada');
  } catch (err) {
    return next(err);
  }
};

exports.eliminar = async (req, res, next) => {
  try {
    const estado = await editable(req.params.recepcionId);
    if (estado.error) return fail(res, estado.error, estado.status);
    const registro = await buscar(req.params.recepcionId, req.params.id);
    if (!registro) return fail(res, 'Temperatura no encontrada', 404);
    await registro.destroy();
    return ok(res, null, 'Temperatura eliminada');
  } catch (err) {
    return next(err);
  }
};
