const { Op } = require('sequelize');

const {
  DetalleMovimiento,
  MermaProduccion,
  MotivoMerma,
  MovimientoInventario,
  OrdenProduccion,
  OrdenProduccionDetalle,
  Producto,
  ResultadoProduccion,
  UnidadMedida,
  Usuario,
} = require('../../models');

class ControlProduccionError extends Error {
  constructor(message, status = 422, details = null) {
    super(message);
    this.name = 'ControlProduccionError';
    this.status = status;
    this.details = details;
  }
}

const PRECISION_CANTIDAD = 6;
const redondearCantidad = (valor) => Number(Number(valor).toFixed(PRECISION_CANTIDAD));
const redondearPorcentaje = (valor) => Number(Number(valor).toFixed(4));

const includeDetalleControl = [
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
    model: ResultadoProduccion,
    as: 'resultadosProduccion',
    required: false,
    include: [
      { model: Producto, as: 'productoTerminado' },
      { model: UnidadMedida, as: 'unidadMedida' },
    ],
  },
];

const includeMerma = [
  { model: Producto, as: 'producto', attributes: ['id', 'codigo', 'nombre', 'tipoProducto'] },
  { model: UnidadMedida, as: 'unidadMedida' },
  { model: MotivoMerma, as: 'motivo' },
  { model: Usuario, as: 'usuario', attributes: ['id', 'nombre', 'correo'] },
];

const obtenerOrden = async (id, transaction, lock = false) => {
  if (lock) {
    const ordenBloqueada = await OrdenProduccion.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!ordenBloqueada) {
      throw new ControlProduccionError('La orden de producción no existe', 404);
    }
    if (ordenBloqueada.estado !== 'EN_PRODUCCION') {
      throw new ControlProduccionError(
        'El control operativo solo está disponible para órdenes EN PRODUCCIÓN',
        409,
      );
    }
  }
  const orden = await OrdenProduccion.findByPk(id, {
    include: includeDetalleControl,
    transaction,
  });
  if (!orden) throw new ControlProduccionError('La orden de producción no existe', 404);
  if (orden.estado !== 'EN_PRODUCCION') {
    throw new ControlProduccionError(
      'El control operativo solo está disponible para órdenes EN PRODUCCIÓN',
      409,
    );
  }
  if (!orden.movimientoSalida) {
    throw new ControlProduccionError(
      'La orden no tiene una salida de materias primas confirmada',
      409,
    );
  }
  return orden;
};

const consolidarConsumosMp = (orden) => {
  const consumos = new Map();
  for (const detalle of orden.movimientoSalida?.detalles || []) {
    const actual = consumos.get(detalle.productoId);
    consumos.set(detalle.productoId, {
      productoId: detalle.productoId,
      producto: detalle.producto,
      unidadMedidaId: detalle.unidadMedidaId,
      unidadMedida: detalle.unidadMedida,
      cantidadConsumida: redondearCantidad(
        Number(actual?.cantidadConsumida || 0) + Number(detalle.cantidad),
      ),
    });
  }
  return [...consumos.values()];
};

const construirResultados = (orden) => {
  const guardados = new Map(
    (orden.resultadosProduccion || []).map((resultado) => [
      resultado.productoTerminadoId,
      resultado,
    ]),
  );
  return orden.detalles.map((detalle) => {
    const guardado = guardados.get(detalle.productoTerminadoId);
    const planeada = redondearCantidad(detalle.cantidad);
    const producida = redondearCantidad(guardado?.cantidadProducida || 0);
    return {
      id: guardado?.id || null,
      ordenProduccionId: orden.id,
      productoTerminadoId: detalle.productoTerminadoId,
      productoTerminado: detalle.productoTerminado,
      cantidadPlaneada: planeada,
      cantidadProducida: producida,
      diferencia: redondearCantidad(producida - planeada),
      unidadMedidaId: detalle.productoTerminado.unidadMedidaId,
      unidadMedida: detalle.productoTerminado.unidadMedida,
      registrado: Boolean(guardado),
    };
  });
};

const listarMermas = (ordenId, transaction) =>
  MermaProduccion.findAll({
    where: { ordenProduccionId: ordenId },
    include: includeMerma,
    order: [
      ['fecha', 'DESC'],
      ['createdAt', 'DESC'],
    ],
    transaction,
  });

const construirIndicadoresMermas = (mermas, consumosMp, resultados) => {
  const acumuladas = new Map();
  for (const merma of mermas) {
    const clave = `${merma.tipoMerma}|${merma.productoId}`;
    acumuladas.set(clave, redondearCantidad((acumuladas.get(clave) || 0) + Number(merma.cantidad)));
  }

  return mermas.map((merma) => {
    const datos = merma.toJSON();
    const mermaAcumulada = acumuladas.get(`${merma.tipoMerma}|${merma.productoId}`) || 0;
    if (merma.tipoMerma === 'MP') {
      const consumo = consumosMp.find((item) => item.productoId === merma.productoId);
      const consumidoOt = redondearCantidad(consumo?.cantidadConsumida || 0);
      const porcentajeMerma = consumidoOt
        ? redondearPorcentaje((mermaAcumulada / consumidoOt) * 100)
        : 0;
      return {
        ...datos,
        indicadores: {
          consumidoOt,
          mermaAcumulada,
          aprovechado: Math.max(0, redondearCantidad(consumidoOt - mermaAcumulada)),
          porcentajeMerma,
          porcentajeAprovechamiento: redondearPorcentaje(100 - porcentajeMerma),
        },
      };
    }

    const resultado = resultados.find((item) => item.productoTerminadoId === merma.productoId);
    const planeado = redondearCantidad(resultado?.cantidadPlaneada || 0);
    return {
      ...datos,
      indicadores: {
        planeado,
        producido: redondearCantidad(resultado?.cantidadProducida || 0),
        mermaAcumulada,
        porcentajeMerma: planeado ? redondearPorcentaje((mermaAcumulada / planeado) * 100) : 0,
      },
    };
  });
};

const obtenerDetalleControl = async (id, transaction) => {
  const orden = await obtenerOrden(id, transaction);
  const [mermas, motivos] = await Promise.all([
    listarMermas(orden.id, transaction),
    MotivoMerma.findAll({
      where: { activo: true },
      order: [['nombre', 'ASC']],
      transaction,
    }),
  ]);
  const resultados = construirResultados(orden);
  const consumosMp = consolidarConsumosMp(orden);
  return {
    orden: {
      id: orden.id,
      numero: orden.numero,
      fecha: orden.fecha,
      estado: orden.estado,
      observaciones: orden.observaciones,
      responsable: orden.usuario,
      fechaSalidaMp: orden.fechaSalidaMp,
      usuarioSalidaMp: orden.usuarioSalidaMp,
      movimientoSalida: {
        id: orden.movimientoSalida.id,
        numeroDocumento: orden.movimientoSalida.numeroDocumento,
        fecha: orden.movimientoSalida.fecha,
      },
    },
    resultados,
    consumosMp,
    mermas: construirIndicadoresMermas(mermas, consumosMp, resultados),
    motivos,
  };
};

const guardarResultados = async (ordenId, resultados, transaction) => {
  const orden = await obtenerOrden(ordenId, transaction, true);
  const detalles = new Map(orden.detalles.map((detalle) => [detalle.productoTerminadoId, detalle]));
  const repetidos = resultados
    .map((resultado) => resultado.productoTerminadoId)
    .filter((id, indice, ids) => ids.indexOf(id) !== indice);
  if (repetidos.length) {
    throw new ControlProduccionError('No se puede registrar dos veces el mismo producto terminado');
  }

  for (const resultado of resultados) {
    const detalle = detalles.get(resultado.productoTerminadoId);
    if (!detalle) {
      throw new ControlProduccionError('Uno de los productos no pertenece a esta orden');
    }
    const cantidadProducida = redondearCantidad(resultado.cantidadProducida);
    if (!Number.isFinite(cantidadProducida) || cantidadProducida < 0) {
      throw new ControlProduccionError('La cantidad producida debe ser mayor o igual a cero');
    }
    const cantidadPlaneada = redondearCantidad(detalle.cantidad);
    const mermaRegistrada = redondearCantidad(
      (await MermaProduccion.sum('cantidad', {
        where: {
          ordenProduccionId: orden.id,
          tipoMerma: 'PT',
          productoId: resultado.productoTerminadoId,
        },
        transaction,
      })) || 0,
    );
    if (redondearCantidad(cantidadProducida + mermaRegistrada) > cantidadPlaneada) {
      throw new ControlProduccionError(
        'La cantidad producida más la merma PT registrada no puede superar la cantidad planeada',
        422,
        {
          planeado: cantidadPlaneada,
          producido: cantidadProducida,
          mermaRegistrada,
          mermaMaximaDisponible: Math.max(
            0,
            redondearCantidad(cantidadPlaneada - cantidadProducida),
          ),
        },
      );
    }
    const valores = {
      cantidadPlaneada,
      cantidadProducida,
      unidadMedidaId: detalle.productoTerminado.unidadMedidaId,
    };
    const existente = await ResultadoProduccion.findOne({
      where: { ordenProduccionId: orden.id, productoTerminadoId: resultado.productoTerminadoId },
      transaction,
    });
    if (existente) await existente.update(valores, { transaction });
    else {
      await ResultadoProduccion.create(
        {
          ordenProduccionId: orden.id,
          productoTerminadoId: resultado.productoTerminadoId,
          ...valores,
        },
        { transaction },
      );
    }
  }
};

const limiteMerma = async ({ orden, tipoMerma, productoId, transaction }) => {
  if (tipoMerma === 'MP') {
    const consumo = consolidarConsumosMp(orden).find((item) => item.productoId === productoId);
    if (!consumo) {
      throw new ControlProduccionError('La materia prima no fue consumida por esta orden');
    }
    return {
      limite: Number(consumo.cantidadConsumida),
      unidadMedidaId: consumo.unidadMedidaId,
      mensaje: 'la cantidad consumida en la OT',
    };
  }

  const detalle = orden.detalles.find((item) => item.productoTerminadoId === productoId);
  if (!detalle) throw new ControlProduccionError('El producto terminado no pertenece a esta orden');
  const resultado = await ResultadoProduccion.findOne({
    where: { ordenProduccionId: orden.id, productoTerminadoId: productoId },
    transaction,
  });
  if (!resultado) {
    throw new ControlProduccionError(
      'Primero debe guardar la producción real de este producto terminado',
      409,
    );
  }
  const planeado = redondearCantidad(detalle.cantidad);
  const producido = redondearCantidad(resultado.cantidadProducida);
  return {
    limite: Math.max(0, redondearCantidad(planeado - producido)),
    planeado,
    producido,
    unidadMedidaId: resultado.unidadMedidaId,
    mensaje: 'la diferencia entre lo planeado y el producto bueno obtenido',
  };
};

const validarYGuardarMerma = async ({ ordenId, mermaId, datos, usuarioId, transaction }) => {
  const orden = await obtenerOrden(ordenId, transaction, true);
  const motivo = await MotivoMerma.findOne({
    where: { id: datos.motivoMermaId, activo: true },
    transaction,
  });
  if (!motivo) throw new ControlProduccionError('El motivo de merma no es válido');

  const cantidad = redondearCantidad(datos.cantidad);
  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    throw new ControlProduccionError('La cantidad de merma debe ser mayor que cero');
  }
  const limite = await limiteMerma({
    orden,
    tipoMerma: datos.tipoMerma,
    productoId: datos.productoId,
    transaction,
  });
  const whereAcumulado = {
    ordenProduccionId: orden.id,
    tipoMerma: datos.tipoMerma,
    productoId: datos.productoId,
  };
  if (mermaId) whereAcumulado.id = { [Op.ne]: mermaId };
  const acumulada = redondearCantidad(
    (await MermaProduccion.sum('cantidad', { where: whereAcumulado, transaction })) || 0,
  );
  const mermaTotal = redondearCantidad(acumulada + cantidad);
  if (mermaTotal > limite.limite) {
    const mermaMaximaDisponible = Math.max(0, redondearCantidad(limite.limite - acumulada));
    const detallesError = {
      mermaRegistrada: acumulada,
      mermaMaximaDisponible,
    };
    if (datos.tipoMerma === 'PT') {
      Object.assign(detallesError, {
        planeado: limite.planeado,
        producido: limite.producido,
      });
      throw new ControlProduccionError(
        `La merma PT supera el máximo disponible de ${mermaMaximaDisponible}`,
        422,
        detallesError,
      );
    }
    throw new ControlProduccionError(`La merma acumulada no puede superar ${limite.mensaje}`, 422, {
      ...detallesError,
      limite: limite.limite,
    });
  }

  const valores = {
    tipoMerma: datos.tipoMerma,
    productoId: datos.productoId,
    cantidad,
    unidadMedidaId: limite.unidadMedidaId,
    motivoMermaId: datos.motivoMermaId,
    observacion: datos.observacion?.trim() || null,
    usuarioId,
  };
  if (!mermaId) {
    return MermaProduccion.create(
      { ordenProduccionId: orden.id, fecha: new Date(), ...valores },
      {
        transaction,
      },
    );
  }
  const merma = await MermaProduccion.findOne({
    where: { id: mermaId, ordenProduccionId: orden.id },
    transaction,
  });
  if (!merma) throw new ControlProduccionError('El registro de merma no existe', 404);
  await merma.update(valores, { transaction });
  return merma;
};

const eliminarMerma = async (ordenId, mermaId, transaction) => {
  const orden = await obtenerOrden(ordenId, transaction, true);
  const eliminados = await MermaProduccion.destroy({
    where: { id: mermaId, ordenProduccionId: orden.id },
    transaction,
  });
  if (!eliminados) throw new ControlProduccionError('El registro de merma no existe', 404);
};

module.exports = {
  ControlProduccionError,
  eliminarMerma,
  guardarResultados,
  listarMermas,
  obtenerDetalleControl,
  validarYGuardarMerma,
};
