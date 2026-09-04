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
  UnidadMedida,
  Vehiculo,
  Bodega,
  LugarArea,
  MovimientoInventario,
  DetalleMovimiento,
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
    include: [{ model: Producto, as: 'producto' }],
  },
  { model: CondicionAmbientalRecepcion, as: 'condicionAmbiental' },
  { model: ResultadoRecepcion, as: 'resultado' },
  {
    model: MovimientoInventario,
    as: 'movimientoInventario',
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
    Bodega.findByPk(bodegaId, { transaction }),
    lugarAreaId ? LugarArea.findByPk(lugarAreaId, { transaction }) : null,
  ]);
  if (!proveedor || !proveedor.estado) return 'El proveedor no existe o está inactivo';
  if (!bodega || !bodega.estado) return 'La bodega no existe o está inactiva';
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
      const detalles = await validarDetalles(req.body.detalles, transaction);
      const numero = await siguienteNumero('recepciones_numero_seq', 'REC', transaction);
      const cabecera = await Recepcion.create(
        {
          numero,
          fechaRecepcion,
          proveedorId,
          bodegaId,
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
      bodegaId: req.body.bodegaId ?? recepcion.bodegaId,
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
    const { recepcion, movimiento } = await finalizarRecepcion({
      recepcionId: req.params.id,
      usuarioId: req.usuario.id,
    });
    const completa = await obtenerCompleta(recepcion.id);
    return ok(
      res,
      completa,
      `Recepción terminada y movimiento ${movimiento.numeroDocumento} generado`,
    );
  } catch (err) {
    return next(err);
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
