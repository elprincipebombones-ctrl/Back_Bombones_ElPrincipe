const sequelize = require('../../database/database');
const {
  Recepcion,
  DetalleRecepcion,
  RecepcionVehiculo,
  VerificacionRecepcion,
  TemperaturaRecepcion,
  CondicionAmbientalRecepcion,
  ResultadoRecepcion,
  Proveedor,
  Producto,
  CategoriaProducto,
  CondicionTermica,
  UnidadMedida,
  Vehiculo,
  Bodega,
  LugarArea,
  MovimientoInventario,
  DetalleMovimiento,
  AccionMejoraRecepcion,
} = require('../../models');
const { ok, created, fail } = require('../../utils/response');
const {
  limpiarTexto,
  recepcionEsEditable,
  siguienteNumero,
  validarDetalles,
  finalizarRecepcion,
} = require('../../services/recepcion/recepcion.service');

const includeCompleto = [
  { model: Proveedor, as: 'proveedor' },
  { model: Bodega, as: 'bodega' },
  { model: LugarArea, as: 'lugarArea' },
  {
    model: DetalleRecepcion,
    as: 'detalles',
    include: [
      {
        model: Producto,
        as: 'producto',
        include: [
          { model: CategoriaProducto, as: 'categoriaProducto' },
          { model: CondicionTermica, as: 'condicionTermica' },
          { model: UnidadMedida, as: 'unidadMedida' },
        ],
      },
      { model: UnidadMedida, as: 'unidadMedida' },
    ],
  },
  {
    model: RecepcionVehiculo,
    as: 'vehiculos',
    include: [{ model: Vehiculo, as: 'vehiculo' }],
  },
  { model: VerificacionRecepcion, as: 'verificacion' },
  {
    model: TemperaturaRecepcion,
    as: 'temperaturas',
    include: [
      {
        model: Producto,
        as: 'producto',
        include: [{ model: CondicionTermica, as: 'condicionTermica' }],
      },
      { model: DetalleRecepcion, as: 'detalleRecepcion' },
    ],
  },
  { model: CondicionAmbientalRecepcion, as: 'condicionAmbiental' },
  { model: ResultadoRecepcion, as: 'resultado' },
  {
    model: AccionMejoraRecepcion,
    as: 'accionesMejora',
    required: false,
    include: [
      {
        model: DetalleRecepcion,
        as: 'detalleRecepcion',
        include: [{ model: Producto, as: 'producto' }],
      },
    ],
  },
  {
    model: MovimientoInventario,
    as: 'movimientosInventario',
    required: false,
    include: [
      {
        model: DetalleMovimiento,
        as: 'detalles',
        include: [
          { model: Producto, as: 'producto' },
          { model: UnidadMedida, as: 'unidadMedida' },
        ],
      },
    ],
  },
];

const obtenerCompleta = (id, transaction) =>
  Recepcion.findByPk(id, { include: includeCompleto, transaction });

const validarCabecera = async ({ proveedorId, bodegaId, lugarAreaId }, transaction) => {
  const [proveedor, bodega, lugar] = await Promise.all([
    Proveedor.findByPk(proveedorId, { transaction }),
    bodegaId ? Bodega.findByPk(bodegaId, { transaction }) : null,
    lugarAreaId ? LugarArea.findByPk(lugarAreaId, { transaction }) : null,
  ]);
  if (!proveedor || !proveedor.estado || !proveedor.esProveedor)
    return 'El proveedor no existe o está inactivo';
  if (bodegaId && (!bodega || !bodega.estado)) return 'La bodega no existe o está inactiva';
  if (lugarAreaId && (!lugar || !lugar.estado)) return 'El lugar o área no existe o está inactivo';
  return null;
};

exports.listar = async (req, res, next) => {
  try {
    const recepciones = await Recepcion.findAll({
      include: [
        { model: Proveedor, as: 'proveedor' },
        { model: Bodega, as: 'bodega' },
        { model: LugarArea, as: 'lugarArea' },
        {
          model: DetalleRecepcion,
          as: 'detalles',
          include: [{ model: Producto, as: 'producto' }],
        },
      ],
      order: [['fechaRecepcion', 'DESC']],
    });
    return ok(res, recepciones);
  } catch (err) {
    return next(err);
  }
};

exports.obtener = async (req, res, next) => {
  try {
    const recepcion = await obtenerCompleta(req.params.id);
    return recepcion ? ok(res, recepcion) : fail(res, 'Recepción no encontrada', 404);
  } catch (err) {
    return next(err);
  }
};

exports.crear = async (req, res, next) => {
  try {
    const recepcion = await sequelize.transaction(async (transaction) => {
      const { fechaRecepcion, proveedorId, bodegaId, lugarAreaId, observaciones } = req.body;
      const errorCabecera = await validarCabecera(
        { proveedorId, bodegaId, lugarAreaId },
        transaction,
      );
      if (errorCabecera) {
        const error = new Error(errorCabecera);
        error.status = 422;
        throw error;
      }
      const detalles = await validarDetalles(
        req.body.detalles.map((d) => ({ ...d, bodegaId: d.bodegaId || bodegaId })),
        transaction,
      );
      const numero = await siguienteNumero('recepciones_numero_seq', 'REC', transaction);
      const cabecera = await Recepcion.create(
        {
          numero,
          fechaRecepcion,
          proveedorId,
          bodegaId: bodegaId || null,
          lugarAreaId: lugarAreaId || null,
          estado: 'EN_PROCESO',
          observaciones: limpiarTexto(observaciones),
          usuarioRecepcionId: req.usuario.id,
        },
        { transaction },
      );

      await DetalleRecepcion.bulkCreate(
        detalles.map((detalle) => ({
          ...detalle,
          recepcionId: cabecera.id,
        })),
        { transaction },
      );
      if (req.body.verificacion) {
        await VerificacionRecepcion.create(
          { ...req.body.verificacion, recepcionId: cabecera.id },
          { transaction },
        );
      }
      if (req.body.condicionAmbiental) {
        await CondicionAmbientalRecepcion.create(
          { ...req.body.condicionAmbiental, recepcionId: cabecera.id },
          { transaction },
        );
      }
      return cabecera;
    });
    return created(res, await obtenerCompleta(recepcion.id), 'Recepción creada');
  } catch (err) {
    return next(err);
  }
};

exports.actualizar = async (req, res, next) => {
  try {
    const recepcion = await Recepcion.findByPk(req.params.id);
    if (!recepcion) return fail(res, 'Recepción no encontrada', 404);
    if (!recepcionEsEditable(recepcion)) {
      return fail(res, 'Una recepción terminada es de solo lectura', 409);
    }
    const cambios = {
      fechaRecepcion: req.body.fechaRecepcion ?? recepcion.fechaRecepcion,
      proveedorId: req.body.proveedorId ?? recepcion.proveedorId,
      bodegaId: req.body.bodegaId === undefined ? recepcion.bodegaId : req.body.bodegaId,
      lugarAreaId:
        req.body.lugarAreaId === undefined ? recepcion.lugarAreaId : req.body.lugarAreaId,
      observaciones:
        req.body.observaciones === undefined
          ? recepcion.observaciones
          : limpiarTexto(req.body.observaciones),
    };
    const errorCabecera = await validarCabecera(cambios);
    if (errorCabecera) return fail(res, errorCabecera, 422);
    await recepcion.update(cambios);
    return ok(res, await obtenerCompleta(recepcion.id), 'Recepción actualizada');
  } catch (err) {
    return next(err);
  }
};

exports.finalizar = async (req, res, next) => {
  try {
    const { recepcion, movimientos, recepcionParcial } = await finalizarRecepcion({
      recepcionId: req.params.id,
      usuarioId: req.usuario.id,
    });
    const completa = await obtenerCompleta(recepcion.id);
    return ok(
      res,
      completa,
      movimientos.length
        ? `Recepción terminada${recepcionParcial ? ' con novedad' : ''}. ${movimientos.length} entrada(s) de inventario generadas`
        : 'Recepción rechazada sin generar movimiento de inventario',
    );
  } catch (err) {
    return next(err);
  }
};

exports.asignarBodega = async (req, res, next) => {
  try {
    await sequelize.transaction(async (transaction) => {
      const recepcion = await Recepcion.findByPk(req.params.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!recepcion || !recepcionEsEditable(recepcion)) {
        throw Object.assign(new Error('La recepción no existe o ya está finalizada'), {
          status: 409,
        });
      }
      const bodega = await Bodega.findByPk(req.body.bodegaId, {
        transaction,
        lock: transaction.LOCK.SHARE,
      });
      if (!bodega?.estado)
        throw Object.assign(new Error('La bodega no existe o está inactiva'), { status: 422 });
      await DetalleRecepcion.update(
        { bodegaId: bodega.id },
        { where: { recepcionId: recepcion.id }, transaction },
      );
      await recepcion.update({ bodegaId: bodega.id }, { transaction });
    });
    return ok(res, await obtenerCompleta(req.params.id), 'Bodega asignada a todos los productos');
  } catch (error) {
    return next(error);
  }
};

exports.eliminar = async (req, res, next) => {
  try {
    const recepcion = await Recepcion.findByPk(req.params.id);
    if (!recepcion) return fail(res, 'Recepción no encontrada', 404);
    if (!recepcionEsEditable(recepcion)) {
      return fail(res, 'No se puede eliminar una recepción terminada', 409);
    }
    await recepcion.destroy();
    return ok(res, null, 'Recepción eliminada');
  } catch (err) {
    return next(err);
  }
};
