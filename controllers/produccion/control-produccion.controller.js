const { Op } = require('sequelize');

const sequelize = require('../../database/database');
const {
  OrdenProduccion,
  OrdenProduccionDetalle,
  Producto,
  UnidadMedida,
  Usuario,
} = require('../../models');
const { created, fail, ok } = require('../../utils/response');
const {
  ControlProduccionError,
  eliminarMerma,
  guardarResultados,
  obtenerDetalleControl,
  validarYGuardarMerma,
} = require('../../services/produccion/control-produccion.service');

const manejarError = (error, res, next) => {
  if (error instanceof ControlProduccionError || error.status) {
    return fail(res, error.message, error.status || 422, error.details || null);
  }
  return next(error);
};

exports.listarOrdenes = async (req, res, next) => {
  try {
    const buscar = String(req.query.buscar || '').trim();
    const where = { estado: 'EN_PRODUCCION' };
    if (buscar) {
      where[Op.or] = [
        { numero: { [Op.iLike]: `%${buscar}%` } },
        { '$detalles.productoTerminado.nombre$': { [Op.iLike]: `%${buscar}%` } },
        { '$detalles.productoTerminado.codigo$': { [Op.iLike]: `%${buscar}%` } },
      ];
    }
    const ordenes = await OrdenProduccion.findAll({
      where,
      include: [
        { model: Usuario, as: 'usuario', attributes: ['id', 'nombre', 'correo'] },
        {
          model: OrdenProduccionDetalle,
          as: 'detalles',
          include: [
            {
              model: Producto,
              as: 'productoTerminado',
              attributes: ['id', 'codigo', 'nombre'],
              include: [{ model: UnidadMedida, as: 'unidadMedida' }],
            },
          ],
        },
      ],
      order: [
        ['fechaSalidaMp', 'DESC'],
        ['numero', 'DESC'],
      ],
      subQuery: false,
    });
    return ok(res, ordenes);
  } catch (error) {
    return next(error);
  }
};

exports.obtenerDetalle = async (req, res, next) => {
  try {
    return ok(res, await obtenerDetalleControl(req.params.id));
  } catch (error) {
    return manejarError(error, res, next);
  }
};

exports.guardarResultados = async (req, res, next) => {
  try {
    await sequelize.transaction(async (transaction) => {
      await guardarResultados(req.params.id, req.body.resultados, transaction);
    });
    return ok(
      res,
      await obtenerDetalleControl(req.params.id),
      'Producción real guardada correctamente',
    );
  } catch (error) {
    return manejarError(error, res, next);
  }
};

exports.listarMermas = async (req, res, next) => {
  try {
    const detalle = await obtenerDetalleControl(req.params.id);
    return ok(res, detalle.mermas);
  } catch (error) {
    return manejarError(error, res, next);
  }
};

exports.crearMerma = async (req, res, next) => {
  try {
    const merma = await sequelize.transaction((transaction) =>
      validarYGuardarMerma({
        ordenId: req.params.id,
        datos: req.body,
        usuarioId: req.usuario.id,
        transaction,
      }),
    );
    return created(res, merma, 'Merma registrada correctamente');
  } catch (error) {
    return manejarError(error, res, next);
  }
};

exports.actualizarMerma = async (req, res, next) => {
  try {
    await sequelize.transaction((transaction) =>
      validarYGuardarMerma({
        ordenId: req.params.id,
        mermaId: req.params.mermaId,
        datos: req.body,
        usuarioId: req.usuario.id,
        transaction,
      }),
    );
    return ok(res, await obtenerDetalleControl(req.params.id), 'Merma actualizada correctamente');
  } catch (error) {
    return manejarError(error, res, next);
  }
};

exports.eliminarMerma = async (req, res, next) => {
  try {
    await sequelize.transaction((transaction) =>
      eliminarMerma(req.params.id, req.params.mermaId, transaction),
    );
    return ok(res, null, 'Merma eliminada correctamente');
  } catch (error) {
    return manejarError(error, res, next);
  }
};
