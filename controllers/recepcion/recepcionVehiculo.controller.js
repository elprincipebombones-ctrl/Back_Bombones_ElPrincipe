const { Recepcion, RecepcionVehiculo, Vehiculo } = require('../../models');
const { ok, created, fail } = require('../../utils/response');

const include = [{ model: Vehiculo, as: 'vehiculo' }];
const buscar = (recepcionId, id) =>
  RecepcionVehiculo.findOne({ where: { id, recepcionId }, include });

const editable = async (recepcionId) => {
  const recepcion = await Recepcion.findByPk(recepcionId);
  if (!recepcion) return { error: 'Recepción no encontrada', status: 404 };
  if (recepcion.estado === 'TERMINADA') {
    return { error: 'Una recepción terminada es de solo lectura', status: 409 };
  }
  return { recepcion };
};

exports.listar = async (req, res, next) => {
  try {
    const recepcion = await Recepcion.findByPk(req.params.recepcionId);
    if (!recepcion) return fail(res, 'Recepción no encontrada', 404);
    return ok(
      res,
      await RecepcionVehiculo.findAll({
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
    return registro ? ok(res, registro) : fail(res, 'Vehículo no encontrado en la recepción', 404);
  } catch (err) {
    return next(err);
  }
};

const validarVehiculo = async (vehiculoId) => {
  const vehiculo = await Vehiculo.findByPk(vehiculoId);
  return vehiculo && vehiculo.estado;
};

exports.crear = async (req, res, next) => {
  try {
    const estado = await editable(req.params.recepcionId);
    if (estado.error) return fail(res, estado.error, estado.status);
    if (!(await validarVehiculo(req.body.vehiculoId))) {
      return fail(res, 'El vehículo no existe o está inactivo', 422);
    }
    const repetido = await RecepcionVehiculo.findOne({
      where: { recepcionId: req.params.recepcionId, vehiculoId: req.body.vehiculoId },
    });
    if (repetido) return fail(res, 'El vehículo ya está asociado a la recepción', 409);
    const registro = await RecepcionVehiculo.create({
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
    if (!registro) return fail(res, 'Vehículo no encontrado en la recepción', 404);
    if (req.body.vehiculoId && !(await validarVehiculo(req.body.vehiculoId))) {
      return fail(res, 'El vehículo no existe o está inactivo', 422);
    }
    await registro.update(req.body);
    return ok(res, await buscar(req.params.recepcionId, registro.id), 'Vehículo actualizado');
  } catch (err) {
    return next(err);
  }
};

exports.eliminar = async (req, res, next) => {
  try {
    const estado = await editable(req.params.recepcionId);
    if (estado.error) return fail(res, estado.error, estado.status);
    const registro = await buscar(req.params.recepcionId, req.params.id);
    if (!registro) return fail(res, 'Vehículo no encontrado en la recepción', 404);
    await registro.destroy();
    return ok(res, null, 'Vehículo retirado de la recepción');
  } catch (err) {
    return next(err);
  }
};
