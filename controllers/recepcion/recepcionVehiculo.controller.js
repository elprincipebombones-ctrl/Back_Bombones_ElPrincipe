const { randomUUID } = require('crypto');
const { Op } = require('sequelize');
const { Recepcion, RecepcionVehiculo, Vehiculo, sequelize } = require('../../models');
const { ApiError } = require('../../utils/ApiError');
const { ok, created, fail } = require('../../utils/response');

const include = [{ model: Vehiculo, as: 'vehiculo', required: false }];

const buscar = (recepcionId, id, transaction) =>
  RecepcionVehiculo.findOne({ where: { id, recepcionId }, include, transaction });

const editable = async (recepcionId, transaction) => {
  const recepcion = await Recepcion.findByPk(recepcionId, {
    transaction,
    lock: transaction?.LOCK.UPDATE,
  });
  if (!recepcion) throw new ApiError('Recepción no encontrada', 404);
  if (recepcion.estado !== 'EN_PROCESO') {
    throw new ApiError('La recepción finalizada es de solo lectura', 409);
  }
  return recepcion;
};

const texto = (valor) => {
  const limpio = String(valor ?? '').trim();
  return limpio || null;
};

const snapshotDesdeVehiculo = (vehiculo) => ({
  placaSnapshot: vehiculo.placa.trim().toUpperCase(),
  tipoVehiculoSnapshot: texto(vehiculo.tipoVehiculo),
  marcaSnapshot: texto(vehiculo.marca),
  modeloSnapshot: texto(vehiculo.modelo),
});

const snapshotOcasional = (body) => ({
  placaSnapshot: body.placa.trim().toUpperCase(),
  tipoVehiculoSnapshot: texto(body.tipoVehiculo),
  marcaSnapshot: texto(body.marca),
  modeloSnapshot: texto(body.modelo),
});

const datosOperativos = (body) => ({
  temperatura: body.temperatura ?? null,
  precinto: texto(body.precinto),
  guiaTransporte: texto(body.guiaTransporte),
  hora: body.hora || null,
  vehiculoConductorOk: body.vehiculoConductorOk ?? null,
});

const obtenerVehiculoActivo = async (vehiculoId, transaction) => {
  const vehiculo = await Vehiculo.findOne({
    where: { id: vehiculoId, estado: true },
    transaction,
  });
  if (!vehiculo) throw new ApiError('El vehículo no existe o está inactivo', 422);
  return vehiculo;
};

const crearVehiculoMaestro = async (recepcion, body, transaction) => {
  const placa = body.placa.trim().toUpperCase();
  const existente = await Vehiculo.findOne({
    where: { placa: { [Op.iLike]: placa } },
    transaction,
  });
  if (existente) {
    throw new ApiError(
      'La placa ya existe en el maestro. Selecciona el vehículo registrado en lugar de crearlo como ocasional',
      409,
    );
  }

  const placaCodigo = placa.replace(/[^A-Z0-9]/g, '').slice(0, 20) || 'VEHICULO';
  return Vehiculo.create(
    {
      codigo: `OC-${placaCodigo}-${randomUUID().slice(0, 8)}`,
      placa,
      tipoVehiculo: body.tipoVehiculo.trim(),
      marca: texto(body.marca),
      modelo: texto(body.modelo),
      proveedorId: recepcion.proveedorId,
      descripcion: `Registrado desde la recepción ${recepcion.numero}`,
      estado: true,
    },
    { transaction },
  );
};

const resolverVehiculo = async (recepcion, body, transaction) => {
  if (body.vehiculoId) {
    const vehiculo = await obtenerVehiculoActivo(body.vehiculoId, transaction);
    return { vehiculoId: vehiculo.id, ...snapshotDesdeVehiculo(vehiculo) };
  }

  const snapshot = snapshotOcasional(body);
  if (!body.guardarEnMaestro) return { vehiculoId: null, ...snapshot };

  const vehiculo = await crearVehiculoMaestro(recepcion, body, transaction);
  return { vehiculoId: vehiculo.id, ...snapshotDesdeVehiculo(vehiculo) };
};

const validarDuplicado = async (recepcionId, datos, excluirId, transaction) => {
  const condiciones = [{ placaSnapshot: datos.placaSnapshot }];
  if (datos.vehiculoId) condiciones.push({ vehiculoId: datos.vehiculoId });
  const repetido = await RecepcionVehiculo.findOne({
    where: {
      recepcionId,
      ...(excluirId ? { id: { [Op.ne]: excluirId } } : {}),
      [Op.or]: condiciones,
    },
    transaction,
  });
  if (repetido) throw new ApiError('Este vehículo ya está asociado a la recepción', 409);
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
  } catch (error) {
    return next(error);
  }
};

exports.obtener = async (req, res, next) => {
  try {
    const registro = await buscar(req.params.recepcionId, req.params.id);
    return registro ? ok(res, registro) : fail(res, 'Vehículo no encontrado en la recepción', 404);
  } catch (error) {
    return next(error);
  }
};

exports.crear = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const recepcion = await editable(req.params.recepcionId, transaction);
    const vehiculo = await resolverVehiculo(recepcion, req.body, transaction);
    await validarDuplicado(recepcion.id, vehiculo, null, transaction);
    const registro = await RecepcionVehiculo.create(
      { recepcionId: recepcion.id, ...vehiculo, ...datosOperativos(req.body) },
      { transaction },
    );
    await transaction.commit();
    return created(res, await buscar(recepcion.id, registro.id));
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    return next(error);
  }
};

exports.actualizar = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const recepcion = await editable(req.params.recepcionId, transaction);
    const registro = await RecepcionVehiculo.findOne({
      where: { id: req.params.id, recepcionId: recepcion.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!registro) throw new ApiError('Vehículo no encontrado en la recepción', 404);

    const vehiculo = await resolverVehiculo(recepcion, req.body, transaction);
    await validarDuplicado(recepcion.id, vehiculo, registro.id, transaction);
    await registro.update({ ...vehiculo, ...datosOperativos(req.body) }, { transaction });
    await transaction.commit();
    return ok(res, await buscar(recepcion.id, registro.id), 'Vehículo actualizado');
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    return next(error);
  }
};

exports.eliminar = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const recepcion = await editable(req.params.recepcionId, transaction);
    const registro = await RecepcionVehiculo.findOne({
      where: { id: req.params.id, recepcionId: recepcion.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!registro) throw new ApiError('Vehículo no encontrado en la recepción', 404);
    await registro.destroy({ transaction });
    await transaction.commit();
    return ok(res, null, 'Vehículo retirado únicamente de esta recepción');
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    return next(error);
  }
};
