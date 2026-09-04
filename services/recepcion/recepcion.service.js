const sequelize = require('../../database/database');
const {
  Recepcion,
  DetalleRecepcion,
  Producto,
  CategoriaProducto,
  VerificacionRecepcion,
  MovimientoInventario,
  DetalleMovimiento,
} = require('../../models');

class RecepcionError extends Error {
  constructor(message, status = 422, errors = null) {
    super(message);
    this.name = 'RecepcionError';
    this.status = status;
    this.errors = errors;
  }
}

const limpiarTexto = (valor) => {
  if (valor === null || valor === undefined) return null;
  const texto = String(valor).trim();
  return texto || null;
};

const recepcionEsEditable = (recepcion) => recepcion?.estado === 'EN_PROCESO';

const siguienteNumero = async (secuencia, prefijo, transaction, database = sequelize) => {
  const [resultado] = await database.query(`SELECT nextval('${secuencia}') AS consecutivo`, {
    transaction,
  });
  const consecutivo = Number(resultado[0].consecutivo);
  return `${prefijo}-${String(consecutivo).padStart(6, '0')}`;
};

const validarDetalles = async (detalles, transaction, models = { Producto, CategoriaProducto }) => {
  if (!Array.isArray(detalles) || detalles.length === 0) {
    throw new RecepcionError('La recepción debe tener al menos un producto');
  }

  const productos = await models.Producto.findAll({
    where: { id: detalles.map((detalle) => detalle.productoId) },
    include: [{ model: models.CategoriaProducto, as: 'categoriaProducto' }],
    transaction,
  });
  const productosPorId = new Map(productos.map((producto) => [producto.id, producto]));

  return detalles.map((detalle, index) => {
    const producto = productosPorId.get(detalle.productoId);
    if (!producto || !producto.estado) {
      throw new RecepcionError(`El producto del detalle ${index + 1} no existe o está inactivo`);
    }
    if (producto.unidadMedidaId !== detalle.unidadMedidaId) {
      throw new RecepcionError(
        `La unidad del detalle ${index + 1} debe ser la unidad configurada en el producto`,
      );
    }
    const cantidadRecibida = Number(detalle.cantidadRecibida);
    const cantidadSolicitada =
      detalle.cantidadSolicitada === null || detalle.cantidadSolicitada === undefined
        ? null
        : Number(detalle.cantidadSolicitada);
    if (!Number.isFinite(cantidadRecibida) || cantidadRecibida <= 0) {
      throw new RecepcionError(
        `La cantidad recibida del detalle ${index + 1} debe ser mayor que cero`,
      );
    }
    if (
      cantidadSolicitada !== null &&
      (!Number.isFinite(cantidadSolicitada) || cantidadSolicitada <= 0)
    ) {
      throw new RecepcionError(
        `La cantidad solicitada del detalle ${index + 1} debe ser mayor que cero`,
      );
    }

    const clasificacion = producto.categoriaProducto?.clasificacionMp;
    const loteProveedor = limpiarTexto(detalle.loteProveedor);
    const fechaVencimiento = detalle.fechaVencimiento || null;
    if (clasificacion === 'PERECEDERA' && (!loteProveedor || !fechaVencimiento)) {
      throw new RecepcionError(
        `El lote del proveedor y la fecha de vencimiento son obligatorios para el producto perecedero ${producto.nombre}`,
      );
    }

    return {
      productoId: producto.id,
      unidadMedidaId: producto.unidadMedidaId,
      cantidadSolicitada,
      cantidadRecibida,
      loteProveedor,
      fechaVencimiento,
      observaciones: limpiarTexto(detalle.observaciones),
    };
  });
};

const validarVerificacionFinal = (verificacion) => {
  if (!verificacion) {
    throw new RecepcionError('Debe registrar la verificación de recepción antes de finalizar');
  }
  const campos = [
    'certificadoCalidad',
    'plagas',
    'rotuladoCorrecto',
    'condicionesEmbalaje',
    'aparienciaColorTextura',
    'empaqueEmbalaje',
    'olor',
  ];
  if (campos.some((campo) => typeof verificacion[campo] !== 'boolean')) {
    throw new RecepcionError('Debe completar todos los campos de la verificación de recepción');
  }
};

const finalizarRecepcion = async ({
  recepcionId,
  usuarioId,
  database = sequelize,
  models = {
    Recepcion,
    DetalleRecepcion,
    Producto,
    CategoriaProducto,
    VerificacionRecepcion,
    MovimientoInventario,
    DetalleMovimiento,
  },
}) =>
  database.transaction(async (transaction) => {
    const recepcion = await models.Recepcion.findByPk(recepcionId, {
      include: [
        {
          model: models.DetalleRecepcion,
          as: 'detalles',
          include: [
            {
              model: models.Producto,
              as: 'producto',
              include: [{ model: models.CategoriaProducto, as: 'categoriaProducto' }],
            },
          ],
        },
        { model: models.VerificacionRecepcion, as: 'verificacion' },
      ],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!recepcion) throw new RecepcionError('Recepción no encontrada', 404);
    if (recepcion.estado !== 'EN_PROCESO') {
      throw new RecepcionError('La recepción ya está terminada', 409);
    }
    if (!recepcion.bodegaId) {
      throw new RecepcionError('La recepción debe tener una bodega antes de finalizar');
    }
    if (!usuarioId) {
      throw new RecepcionError('No fue posible identificar al usuario que finaliza', 401);
    }

    const existente = await models.MovimientoInventario.findOne({
      where: { origen: 'RECEPCION', origenId: recepcion.id },
      transaction,
    });
    if (existente) {
      throw new RecepcionError('La recepción ya tiene un movimiento de inventario', 409);
    }

    const detalles = recepcion.detalles || [];
    if (detalles.length === 0) {
      throw new RecepcionError('La recepción debe tener al menos un producto');
    }
    for (const [index, detalle] of detalles.entries()) {
      if (Number(detalle.cantidadRecibida) <= 0) {
        throw new RecepcionError(
          `La cantidad recibida del detalle ${index + 1} debe ser mayor que cero`,
        );
      }
      if (detalle.unidadMedidaId !== detalle.producto?.unidadMedidaId) {
        throw new RecepcionError(
          `La unidad del detalle ${index + 1} no coincide con la configurada en el producto`,
        );
      }
      const clasificacion = detalle.producto?.categoriaProducto?.clasificacionMp;
      if (
        clasificacion === 'PERECEDERA' &&
        (!limpiarTexto(detalle.loteProveedor) || !detalle.fechaVencimiento)
      ) {
        throw new RecepcionError(
          `Faltan lote o vencimiento para el producto perecedero ${detalle.producto?.nombre || index + 1}`,
        );
      }
    }
    validarVerificacionFinal(recepcion.verificacion);

    const numeroDocumento = await siguienteNumero(
      'movimientos_en_numero_seq',
      'EN',
      transaction,
      database,
    );
    const movimiento = await models.MovimientoInventario.create(
      {
        tipoDocumento: 'EN',
        numeroDocumento,
        fecha: new Date(),
        bodegaId: recepcion.bodegaId,
        estado: 'APLICADO',
        origen: 'RECEPCION',
        origenId: recepcion.id,
        usuarioId,
        observaciones: `Entrada generada por la recepción ${recepcion.numero}`,
      },
      { transaction },
    );

    await models.DetalleMovimiento.bulkCreate(
      detalles.map((detalle) => ({
        movimientoInventarioId: movimiento.id,
        productoId: detalle.productoId,
        unidadMedidaId: detalle.unidadMedidaId,
        cantidad: detalle.cantidadRecibida,
        lote: detalle.loteProveedor,
        loteProveedor: detalle.loteProveedor,
        fechaVencimiento: detalle.fechaVencimiento,
        costoUnitario: null,
        costoTotal: null,
        observaciones: detalle.observaciones,
      })),
      { transaction },
    );

    await recepcion.update({ estado: 'TERMINADA' }, { transaction });
    return { recepcion, movimiento };
  });

module.exports = {
  RecepcionError,
  limpiarTexto,
  recepcionEsEditable,
  siguienteNumero,
  validarDetalles,
  validarVerificacionFinal,
  finalizarRecepcion,
};
