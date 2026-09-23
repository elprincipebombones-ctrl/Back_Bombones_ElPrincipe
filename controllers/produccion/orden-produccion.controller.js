const { Op } = require('sequelize');

const sequelize = require('../../database/database');
const {
  Bodega,
  CondicionTermica,
  FamiliaMpCarnica,
  FormulaProducto,
  MovimientoInventario,
  OrdenProduccion,
  OrdenProduccionDetalle,
  OrdenProduccionSimulacion,
  OrdenProduccionSimulacionDetalle,
  OrdenProduccionSimulacionLote,
  Producto,
  UnidadMedida,
  Usuario,
} = require('../../models');
const { created, fail, ok } = require('../../utils/response');
const {
  OrdenProduccionError,
  cambiarLoteSimulacion,
  confirmarSalidaMp,
  lotesDisponibles,
  reemplazarDetallesOrden,
  siguienteNumeroOrden,
  simularOrden,
} = require('../../services/produccion/orden-produccion.service');

const includeOrden = [
  { model: Usuario, as: 'usuario', attributes: ['id', 'nombre', 'correo'] },
  {
    model: Usuario,
    as: 'usuarioSalidaMp',
    attributes: ['id', 'nombre', 'correo'],
    required: false,
  },
  {
    model: MovimientoInventario,
    as: 'movimientoSalida',
    attributes: ['id', 'numeroDocumento', 'fecha', 'estado', 'observaciones'],
    required: false,
  },
  {
    model: OrdenProduccionDetalle,
    as: 'detalles',
    include: [
      {
        model: Producto,
        as: 'productoTerminado',
        include: [{ model: UnidadMedida, as: 'unidadMedida' }],
      },
    ],
  },
  {
    model: OrdenProduccionSimulacion,
    as: 'simulacion',
    required: false,
    include: [
      {
        model: OrdenProduccionSimulacionDetalle,
        as: 'detalles',
        include: [
          { model: Producto, as: 'producto' },
          { model: FamiliaMpCarnica, as: 'familiaMpCarnica' },
          { model: UnidadMedida, as: 'unidadMedida' },
          {
            model: OrdenProduccionSimulacionLote,
            as: 'lotes',
            include: [
              {
                model: Producto,
                as: 'producto',
                include: [{ model: CondicionTermica, as: 'condicionTermica' }],
              },
              { model: Bodega, as: 'bodega' },
            ],
          },
        ],
      },
    ],
  },
];

const obtenerCompleta = (id, transaction) =>
  OrdenProduccion.findByPk(id, {
    include: includeOrden,
    order: [
      [{ model: OrdenProduccionDetalle, as: 'detalles' }, 'createdAt', 'ASC'],
      [
        { model: OrdenProduccionSimulacion, as: 'simulacion' },
        { model: OrdenProduccionSimulacionDetalle, as: 'detalles' },
        'createdAt',
        'ASC',
      ],
      [
        { model: OrdenProduccionSimulacion, as: 'simulacion' },
        { model: OrdenProduccionSimulacionDetalle, as: 'detalles' },
        { model: OrdenProduccionSimulacionLote, as: 'lotes' },
        'createdAt',
        'ASC',
      ],
    ],
    transaction,
  });

const fechaBogota = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());

const manejarError = (error, res, next) => {
  if (error instanceof OrdenProduccionError || error.status) {
    return fail(res, error.message, error.status || 422, error.details || null);
  }
  return next(error);
};

exports.catalogos = async (_req, res, next) => {
  try {
    const productos = await Producto.findAll({
      where: { tipoProducto: 'PT', estado: true },
      include: [
        { model: UnidadMedida, as: 'unidadMedida' },
        {
          model: FormulaProducto,
          as: 'formulas',
          required: false,
          where: { activo: true },
          attributes: ['id'],
        },
      ],
      order: [['nombre', 'ASC']],
    });
    return ok(
      res,
      productos.map((producto) => ({
        id: producto.id,
        codigo: producto.codigo,
        nombre: producto.nombre,
        unidadMedida: producto.unidadMedida,
        tieneFormula: producto.formulas.length > 0,
      })),
    );
  } catch (error) {
    return next(error);
  }
};

exports.listar = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.estado) where.estado = req.query.estado;
    if (req.query.buscar) {
      where.numero = { [Op.iLike]: `%${String(req.query.buscar).trim()}%` };
    }
    const ordenes = await OrdenProduccion.findAll({
      where,
      include: [
        { model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] },
        { model: OrdenProduccionDetalle, as: 'detalles', attributes: ['id'] },
        {
          model: OrdenProduccionSimulacion,
          as: 'simulacion',
          required: false,
          attributes: ['id', 'fechaSimulacion'],
        },
        {
          model: MovimientoInventario,
          as: 'movimientoSalida',
          required: false,
          attributes: ['id', 'numeroDocumento', 'fecha'],
        },
      ],
      order: [
        ['fecha', 'DESC'],
        ['createdAt', 'DESC'],
      ],
    });
    return ok(res, ordenes);
  } catch (error) {
    return next(error);
  }
};

exports.obtener = async (req, res, next) => {
  try {
    const orden = await obtenerCompleta(req.params.id);
    if (!orden) return fail(res, 'La orden de producción no existe', 404);
    return ok(res, orden);
  } catch (error) {
    return next(error);
  }
};

exports.crear = async (req, res, next) => {
  try {
    const orden = await sequelize.transaction(async (transaction) => {
      const nueva = await OrdenProduccion.create(
        {
          numero: await siguienteNumeroOrden(transaction),
          fecha: fechaBogota(),
          usuarioId: req.usuario.id,
          estado: 'BORRADOR',
          observaciones: req.body.observaciones?.trim() || null,
        },
        { transaction },
      );
      await reemplazarDetallesOrden(nueva.id, req.body.detalles, transaction);
      return nueva;
    });
    return created(res, await obtenerCompleta(orden.id), 'Orden guardada en borrador');
  } catch (error) {
    return manejarError(error, res, next);
  }
};

exports.actualizar = async (req, res, next) => {
  try {
    await sequelize.transaction(async (transaction) => {
      const orden = await OrdenProduccion.findByPk(req.params.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!orden) throw new OrdenProduccionError('La orden de producción no existe', 404);
      if (orden.estado !== 'BORRADOR') {
        throw new OrdenProduccionError('Solo se pueden modificar órdenes en borrador', 409);
      }
      await reemplazarDetallesOrden(orden.id, req.body.detalles, transaction);
      await orden.update(
        { observaciones: req.body.observaciones?.trim() || null },
        { transaction },
      );
    });
    return ok(res, await obtenerCompleta(req.params.id), 'Borrador actualizado');
  } catch (error) {
    return manejarError(error, res, next);
  }
};

exports.eliminar = async (req, res, next) => {
  try {
    await sequelize.transaction(async (transaction) => {
      const orden = await OrdenProduccion.findByPk(req.params.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!orden) throw new OrdenProduccionError('La orden de producción no existe', 404);
      if (orden.estado !== 'BORRADOR') {
        throw new OrdenProduccionError('Solo se pueden eliminar órdenes en borrador', 409);
      }
      await orden.destroy({ transaction });
    });
    return ok(res, null, 'Orden en borrador eliminada');
  } catch (error) {
    return manejarError(error, res, next);
  }
};

exports.simular = async (req, res, next) => {
  try {
    await sequelize.transaction(async (transaction) => {
      const orden = await OrdenProduccion.findByPk(req.params.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!orden) throw new OrdenProduccionError('La orden de producción no existe', 404);
      if (!['BORRADOR', 'SIMULADA'].includes(orden.estado)) {
        throw new OrdenProduccionError('El estado actual de la orden no permite simular', 409);
      }
      await simularOrden(orden, transaction);
    });
    return ok(res, await obtenerCompleta(req.params.id), 'Simulación guardada correctamente');
  } catch (error) {
    return manejarError(error, res, next);
  }
};

exports.obtenerSimulacion = async (req, res, next) => {
  try {
    const orden = await obtenerCompleta(req.params.id);
    if (!orden) return fail(res, 'La orden de producción no existe', 404);
    return ok(res, orden.simulacion || null);
  } catch (error) {
    return next(error);
  }
};

exports.lotesDisponibles = async (req, res, next) => {
  try {
    const lote = await OrdenProduccionSimulacionLote.findByPk(req.params.loteSimulacionId, {
      include: [
        {
          model: OrdenProduccionSimulacionDetalle,
          as: 'detalle',
          include: [{ model: OrdenProduccionSimulacion, as: 'simulacion' }],
        },
      ],
    });
    if (!lote || lote.detalle.simulacion.ordenProduccionId !== req.params.id) {
      return fail(res, 'La asignación de lote no existe', 404);
    }
    return ok(res, await lotesDisponibles(lote.productoId));
  } catch (error) {
    return manejarError(error, res, next);
  }
};

exports.cambiarLote = async (req, res, next) => {
  try {
    await sequelize.transaction(async (transaction) => {
      await cambiarLoteSimulacion({
        ordenId: req.params.id,
        loteSimulacionId: req.params.loteSimulacionId,
        seleccion: req.body,
        transaction,
      });
    });
    return ok(res, await obtenerCompleta(req.params.id), 'Lote actualizado manualmente');
  } catch (error) {
    return manejarError(error, res, next);
  }
};

exports.confirmarSalida = async (req, res, next) => {
  try {
    await sequelize.transaction(async (transaction) => {
      const orden = await OrdenProduccion.findByPk(req.params.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!orden) throw new OrdenProduccionError('La orden de producción no existe', 404);
      await confirmarSalidaMp(orden, req.usuario.id, transaction);
    });
    return ok(
      res,
      await obtenerCompleta(req.params.id),
      'Salida de materias primas confirmada correctamente',
    );
  } catch (error) {
    return manejarError(error, res, next);
  }
};
