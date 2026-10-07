const sequelize = require('../../database/database');
const servicio = require('../../services/produccion/solicitudes-mp.service');
const { ok, created, fail } = require('../../utils/response');

const manejarError = (error, res, next) =>
  error.status ? fail(res, error.message, error.status, error.details || null) : next(error);

exports.catalogos = async (req, res, next) => {
  try {
    return ok(res, await servicio.catalogos(req.params.id, req.query.tipo));
  } catch (error) {
    return manejarError(error, res, next);
  }
};

exports.historial = async (req, res, next) => {
  try {
    return ok(res, await servicio.listar({ ordenId: req.params.id }));
  } catch (error) {
    return manejarError(error, res, next);
  }
};

exports.listar = async (req, res, next) => {
  try {
    return ok(res, await servicio.listar(req.query));
  } catch (error) {
    return manejarError(error, res, next);
  }
};

exports.obtener = async (req, res, next) => {
  try {
    return ok(res, await servicio.obtener(req.params.solicitudId));
  } catch (error) {
    return manejarError(error, res, next);
  }
};

exports.crear = async (req, res, next) => {
  try {
    const solicitud = await sequelize.transaction((transaction) =>
      servicio.crear(req.params.id, req.body, req.usuario.id, transaction),
    );
    return created(
      res,
      await servicio.obtener(solicitud.id),
      'Solicitud pendiente creada; no se movió inventario',
    );
  } catch (error) {
    return manejarError(error, res, next);
  }
};

exports.resolver = async (req, res, next) => {
  try {
    const solicitud = await sequelize.transaction((transaction) =>
      servicio.resolver(
        req.params.solicitudId,
        req.body.accion,
        req.body.observacion,
        req.usuario.id,
        transaction,
      ),
    );
    return ok(
      res,
      await servicio.obtener(solicitud.id),
      solicitud.estado === 'ATENDIDA'
        ? 'Solicitud atendida y movimientos generados'
        : 'Solicitud rechazada sin mover inventario',
    );
  } catch (error) {
    return manejarError(error, res, next);
  }
};
