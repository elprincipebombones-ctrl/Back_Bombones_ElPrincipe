const { Op } = require('sequelize');

const {
  Bodega,
  DetalleMovimiento,
  FormatoCalidad,
  Inspeccion,
  MermaProduccion,
  MotivoMerma,
  MovimientoInventario,
  OrdenProduccion,
  OrdenProduccionDetalle,
  Producto,
  ResultadoProduccion,
  SolicitudMovimientoOt,
  TipoInspeccion,
  UnidadMedida,
  Usuario,
  VersionFormato,
} = require('../../models');

const { listarParciales, saldosPep, siguienteNumero } = require('./produccion-parcial.service');

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
  {
    model: SolicitudMovimientoOt,
    as: 'solicitudesMp',
    where: { estado: 'ATENDIDA' },
    required: false,
    include: [
      { model: Producto, as: 'producto' },
      { model: UnidadMedida, as: 'unidadMedida' },
    ],
  },
  { model: MovimientoInventario, as: 'movimientoPep', required: false },
  { model: Usuario, as: 'usuarioInicio', attributes: ['id', 'nombre'], required: false },
  { model: Usuario, as: 'usuario', attributes: ['id', 'nombre', 'correo'] },
  {
    model: Usuario,
    as: 'usuarioSalidaMp',
    attributes: ['id', 'nombre', 'correo'],
    required: false,
  },
  {
    model: Usuario,
    as: 'usuarioFinalizacion',
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
    model: MovimientoInventario,
    as: 'movimientoEntrada',
    required: false,
    include: [
      { model: Bodega, as: 'bodega' },
      { model: Usuario, as: 'usuario', attributes: ['id', 'nombre', 'correo'] },
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
      { model: Bodega, as: 'bodegaDestino', required: false },
    ],
  },
];

const includeMerma = [
  { model: Producto, as: 'producto', attributes: ['id', 'codigo', 'nombre', 'tipoProducto'] },
  { model: UnidadMedida, as: 'unidadMedida' },
  { model: MotivoMerma, as: 'motivo' },
  { model: Usuario, as: 'usuario', attributes: ['id', 'nombre', 'correo'] },
];

const obtenerOrden = async (id, transaction, lock = false, permitirFinalizada = false) => {
  if (lock) {
    const ordenBloqueada = await OrdenProduccion.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!ordenBloqueada) {
      throw new ControlProduccionError('La orden de producción no existe', 404);
    }
    if (
      ordenBloqueada.estado !== 'EN_PRODUCCION' &&
      !(permitirFinalizada && ['FINALIZADA', 'LISTA_PRODUCCION'].includes(ordenBloqueada.estado))
    ) {
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
  if (
    orden.estado !== 'EN_PRODUCCION' &&
    !(permitirFinalizada && ['FINALIZADA', 'LISTA_PRODUCCION'].includes(orden.estado))
  ) {
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
  for (const consumo of consumos.values()) {
    consumo.enviadoInicial = consumo.cantidadConsumida;
    consumo.adicionalMp = 0;
    consumo.devueltoMp = 0;
  }
  for (const solicitud of orden.solicitudesMp || []) {
    const consumo = consumos.get(solicitud.productoId) || {
      productoId: solicitud.productoId,
      producto: solicitud.producto,
      unidadMedidaId: solicitud.unidadMedidaId,
      unidadMedida: solicitud.unidadMedida,
      cantidadConsumida: 0,
      enviadoInicial: 0,
      adicionalMp: 0,
      devueltoMp: 0,
    };
    const cantidad = Number(solicitud.cantidad);
    if (solicitud.tipo === 'ADICIONAL')
      consumo.adicionalMp = redondearCantidad(consumo.adicionalMp + cantidad);
    else consumo.devueltoMp = redondearCantidad(consumo.devueltoMp + cantidad);
    consumo.cantidadConsumida = redondearCantidad(
      consumo.enviadoInicial + consumo.adicionalMp - consumo.devueltoMp,
    );
    consumos.set(solicitud.productoId, consumo);
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
      desviacionPorcentaje: planeada
        ? redondearPorcentaje(((producida - planeada) / planeada) * 100)
        : 0,
      unidadMedidaId: detalle.productoTerminado.unidadMedidaId,
      unidadMedida: detalle.productoTerminado.unidadMedida,
      registrado: Boolean(guardado),
      lotePt: guardado?.lotePt || null,
      fechaVencimientoSugerida: guardado?.fechaVencimientoSugerida || null,
      fechaVencimientoFinal: guardado?.fechaVencimientoFinal || null,
      bodegaDestinoId: guardado?.bodegaDestinoId || null,
      bodegaDestino: guardado?.bodegaDestino || null,
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
      const consumidoOt = redondearCantidad(
        consumo?.consumoTeorico ?? consumo?.cantidadConsumida ?? 0,
      );
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
    const producido = redondearCantidad(resultado?.cantidadProducida || 0);
    return {
      ...datos,
      indicadores: {
        planeado,
        producido,
        mermaAcumulada,
        porcentajeMerma:
          producido + mermaAcumulada > 0
            ? redondearPorcentaje((mermaAcumulada / (producido + mermaAcumulada)) * 100)
            : 0,
      },
    };
  });
};

const obtenerDetalleControl = async (id, transaction) => {
  const orden = await obtenerOrden(id, transaction, false, true);
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
  const parciales = await listarParciales(orden.id, transaction);
  if (orden.movimientoPepId) {
    const saldos = await saldosPep(orden, transaction);
    for (const consumo of consumosMp) {
      consumo.enviadoPep = consumo.enviadoInicial;
      const saldo = saldos
        .filter((lote) => lote.productoId === consumo.productoId)
        .reduce((total, lote) => total + Number(lote.saldo), 0);
      consumo.consumoTeorico = redondearCantidad(consumo.cantidadConsumida - saldo);
      consumo.mermaMp = redondearCantidad(
        mermas
          .filter((m) => m.tipoMerma === 'MP' && m.productoId === consumo.productoId)
          .reduce((total, m) => total + Number(m.cantidad), 0),
      );
      consumo.saldoEstimadoPep = redondearCantidad(saldo - consumo.mermaMp);
    }
    for (const resultado of resultados) {
      resultado.cantidadProducida = redondearCantidad(
        parciales
          .filter((p) => p.productoTerminadoId === resultado.productoTerminadoId)
          .reduce((total, p) => total + Number(p.cantidad), 0),
      );
      resultado.diferencia = redondearCantidad(
        resultado.cantidadProducida - resultado.cantidadPlaneada,
      );
      resultado.desviacionPorcentaje = resultado.cantidadPlaneada
        ? redondearPorcentaje((resultado.diferencia / resultado.cantidadPlaneada) * 100)
        : 0;
    }
  }
  return {
    parciales,
    orden: {
      id: orden.id,
      numero: orden.numero,
      fecha: orden.fecha,
      estado: orden.estado,
      observaciones: orden.observaciones,
      movimientoPep: orden.movimientoPep,
      produccionParcial: Boolean(orden.movimientoPepId),
      fechaInicio: orden.fechaInicio,
      usuarioInicio: orden.usuarioInicio,
      responsable: orden.usuario,
      fechaSalidaMp: orden.fechaSalidaMp,
      usuarioSalidaMp: orden.usuarioSalidaMp,
      movimientoSalida: {
        id: orden.movimientoSalida.id,
        numeroDocumento: orden.movimientoSalida.numeroDocumento,
        fecha: orden.movimientoSalida.fecha,
      },
      fechaFinalizacion: orden.fechaFinalizacion,
      usuarioFinalizacion: orden.usuarioFinalizacion,
      movimientoEntrada: orden.movimientoEntrada
        ? {
            id: orden.movimientoEntrada.id,
            numeroDocumento: orden.movimientoEntrada.numeroDocumento,
            fecha: orden.movimientoEntrada.fecha,
            bodega: orden.movimientoEntrada.bodega,
            usuario: orden.movimientoEntrada.usuario,
          }
        : null,
    },
    resultados,
    consumosMp,
    mermas: construirIndicadoresMermas(mermas, consumosMp, resultados),
    motivos,
  };
};

const guardarResultados = async (ordenId, resultados, transaction) => {
  const orden = await obtenerOrden(ordenId, transaction, true);
  if (orden.movimientoPepId)
    throw new ControlProduccionError('Use Registrar producción parcial para esta OT', 409);
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
      limite: orden.movimientoPepId
        ? (await saldosPep(orden, transaction))
            .filter((lote) => lote.productoId === productoId)
            .reduce((total, lote) => total + Number(lote.saldo), 0)
        : Number(consumo.cantidadConsumida),
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
    limite: Infinity,
    planeado,
    producido,
    unidadMedidaId: resultado.unidadMedidaId,
    mensaje: 'la producción registrada',
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

const validarCalidadParaCierre = async (ordenId, transaction) => {
  const formatos = await FormatoCalidad.findAll({
    where: { estado: true },
    attributes: ['id', 'codigo', 'nombre'],
    include: [
      {
        model: TipoInspeccion,
        as: 'tipoInspeccion',
        where: { codigo: 'PRODUCCION', estado: true },
        required: true,
        attributes: [],
      },
      {
        model: VersionFormato,
        as: 'versiones',
        where: { estadoVersion: 'PUBLICADO' },
        required: true,
        attributes: ['id'],
      },
    ],
    transaction,
  });

  if (!formatos.length) return;

  const inspecciones = await Inspeccion.findAll({
    where: { ordenProduccionId: ordenId },
    attributes: ['id', 'estado', 'versionFormatoId'],
    include: [
      {
        model: VersionFormato,
        as: 'version',
        attributes: ['id', 'formatoCalidadId'],
      },
    ],
    transaction,
  });

  const pendientes = formatos.filter((formato) => {
    const ejecuciones = inspecciones.filter(
      (inspeccion) => inspeccion.version?.formatoCalidadId === formato.id,
    );
    return !ejecuciones.length || ejecuciones.some((inspeccion) => inspeccion.estado !== 'CERRADA');
  });

  if (pendientes.length) {
    throw new ControlProduccionError(
      'No se puede cerrar la producción: hay controles de Calidad pendientes o sin liberación aprobada',
      409,
      {
        formatosPendientes: pendientes.map((formato) => ({
          id: formato.id,
          codigo: formato.codigo,
          nombre: formato.nombre,
        })),
      },
    );
  }
};

const validarBaseCierre = async (orden, transaction) => {
  if (orden.movimientoEntradaId || orden.movimientoEntrada) {
    throw new ControlProduccionError('Esta OT ya tiene una entrada de producto terminado', 409);
  }

  const entradaExistente = await MovimientoInventario.findOne({
    where: { origen: 'OT', origenId: orden.id, tipoDocumento: 'EN' },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (entradaExistente) {
    throw new ControlProduccionError('Esta OT ya generó su movimiento de entrada', 409);
  }

  const resultadosPorProducto = new Map(
    (orden.resultadosProduccion || []).map((resultado) => [
      resultado.productoTerminadoId,
      resultado,
    ]),
  );
  const faltantes = orden.detalles.filter((detalle) => {
    const resultado = resultadosPorProducto.get(detalle.productoTerminadoId);
    return !resultado || Number(resultado.cantidadProducida) <= 0;
  });
  if (faltantes.length) {
    throw new ControlProduccionError(
      'Debe registrar una cantidad producida mayor que cero para todos los productos terminados',
      409,
      {
        productosPendientes: faltantes.map((detalle) => ({
          id: detalle.productoTerminadoId,
          codigo: detalle.productoTerminado?.codigo,
          nombre: detalle.productoTerminado?.nombre,
        })),
      },
    );
  }

  const resultadosInvalidos = (orden.resultadosProduccion || []).filter((resultado) => {
    const producido = Number(resultado.cantidadProducida);

    return !Number.isFinite(producido) || producido <= 0;
  });
  if (resultadosInvalidos.length) {
    throw new ControlProduccionError(
      'Las cantidades producidas o las mermas PT no son válidas para cerrar la orden',
      409,
    );
  }

  await validarCalidadParaCierre(orden.id, transaction);
  return orden.resultadosProduccion || [];
};

const asegurarLotes = async (resultados, transaction) => {
  for (const resultado of resultados) {
    if (!resultado.lotePt) {
      const lotePt = await siguienteNumero('LOTE', transaction);
      await resultado.update({ lotePt }, { transaction });
    }
  }
};

const prepararCierre = async (ordenId, transaction) => {
  const orden = await obtenerOrden(ordenId, transaction, true);
  const resultados = await validarBaseCierre(orden, transaction);
  const bodegaDefault = await Bodega.findOne({
    where: { esBodegaPtDefault: true, estado: true },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!bodegaDefault) {
    throw new ControlProduccionError(
      'Configure una bodega activa como destino predeterminado de producto terminado',
      409,
    );
  }

  await asegurarLotes(resultados, transaction);
  const sugerida = null;
  const [bodegas, mermasPt] = await Promise.all([
    Bodega.findAll({ where: { estado: true }, order: [['nombre', 'ASC']], transaction }),
    MermaProduccion.findAll({
      where: { ordenProduccionId: orden.id, tipoMerma: 'PT' },
      attributes: ['productoId', 'cantidad'],
      transaction,
    }),
  ]);
  const mermaPorProducto = new Map();
  for (const merma of mermasPt) {
    mermaPorProducto.set(
      merma.productoId,
      redondearCantidad((mermaPorProducto.get(merma.productoId) || 0) + Number(merma.cantidad)),
    );
  }

  return {
    ordenId: orden.id,
    numero: orden.numero,
    produccionParcial: Boolean(orden.movimientoPepId),
    fechaVencimientoSugerida: sugerida,
    bodegaDefault,
    bodegas,
    resultados: resultados.map((resultado) => ({
      id: resultado.id,
      productoTerminadoId: resultado.productoTerminadoId,
      productoTerminado: resultado.productoTerminado,
      cantidadPlaneada: redondearCantidad(resultado.cantidadPlaneada),
      cantidadProducida: redondearCantidad(resultado.cantidadProducida),
      mermaPt: mermaPorProducto.get(resultado.productoTerminadoId) || 0,
      cantidadEntrada: redondearCantidad(resultado.cantidadProducida),
      unidadMedidaId: resultado.unidadMedidaId,
      unidadMedida: resultado.unidadMedida,
      lotePt: resultado.lotePt,
      fechaVencimientoSugerida: sugerida,
      fechaVencimientoFinal: resultado.fechaVencimientoFinal || null,
    })),
  };
};

const cerrarProduccion = async ({
  ordenId,
  bodegaId,
  resultados: resultadosEntrada,
  usuarioId,
  puedeCambiarBodega,
  transaction,
}) => {
  const orden = await obtenerOrden(ordenId, transaction, true);
  const resultados = await validarBaseCierre(orden, transaction);
  if (orden.movimientoPepId) {
    await orden.update(
      { estado: 'FINALIZADA', fechaFinalizacion: new Date(), usuarioFinalizacionId: usuarioId },
      { transaction },
    );
    return null;
  }

  const bodegaDefault = await Bodega.findOne({
    where: { esBodegaPtDefault: true, estado: true },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!bodegaDefault) {
    throw new ControlProduccionError(
      'Configure una bodega activa como destino predeterminado de producto terminado',
      409,
    );
  }
  const bodegaDestino = await Bodega.findOne({
    where: { id: bodegaId, estado: true },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!bodegaDestino) {
    throw new ControlProduccionError('La bodega de destino no existe o está inactiva');
  }
  if (bodegaDestino.id !== bodegaDefault.id && !puedeCambiarBodega) {
    throw new ControlProduccionError(
      'No tiene permiso para cambiar la bodega predeterminada de producto terminado',
      403,
    );
  }

  await asegurarLotes(resultados, transaction);
  const entradasPorId = new Map(
    resultadosEntrada.map((resultado) => [resultado.resultadoProduccionId, resultado]),
  );
  if (entradasPorId.size !== resultados.length) {
    throw new ControlProduccionError('Debe confirmar todos los productos terminados de la OT');
  }
  const sugerida = null;
  const lotes = new Set();
  for (const resultado of resultados) {
    const entrada = entradasPorId.get(resultado.id);
    if (!entrada) {
      throw new ControlProduccionError('Falta confirmar uno de los productos terminados');
    }
    if (!entrada.fechaVencimientoFinal) {
      throw new ControlProduccionError('La fecha de vencimiento final es obligatoria');
    }
    if (lotes.has(resultado.lotePt)) {
      throw new ControlProduccionError('Los lotes de producto terminado deben ser únicos');
    }
    lotes.add(resultado.lotePt);
  }

  const fecha = new Date();
  const numeroDocumento = await siguienteNumero('EN', transaction);
  const movimiento = await MovimientoInventario.create(
    {
      tipoDocumento: 'EN',
      numeroDocumento,
      fecha,
      bodegaId: bodegaDestino.id,
      estado: 'APLICADO',
      origen: 'OT',
      origenId: orden.id,
      usuarioId,
      observaciones: `Entrada de producto terminado por cierre de ${orden.numero}`,
    },
    { transaction },
  );

  await DetalleMovimiento.bulkCreate(
    resultados.map((resultado) => ({
      movimientoInventarioId: movimiento.id,
      productoId: resultado.productoTerminadoId,
      unidadMedidaId: resultado.unidadMedidaId,
      cantidad: redondearCantidad(resultado.cantidadProducida),
      sentido: 'ENTRADA',
      lote: resultado.lotePt,
      fechaVencimiento: entradasPorId.get(resultado.id).fechaVencimientoFinal,
      costoUnitario: null,
      costoTotal: null,
      observaciones: `Producto bueno obtenido en ${orden.numero}`,
    })),
    { transaction },
  );

  for (const resultado of resultados) {
    await resultado.update(
      {
        fechaVencimientoSugerida: sugerida,
        fechaVencimientoFinal: entradasPorId.get(resultado.id).fechaVencimientoFinal,
        bodegaDestinoId: bodegaDestino.id,
      },
      { transaction },
    );
  }
  await orden.update(
    {
      estado: 'FINALIZADA',
      movimientoEntradaId: movimiento.id,
      fechaFinalizacion: fecha,
      usuarioFinalizacionId: usuarioId,
    },
    { transaction },
  );

  return movimiento;
};

module.exports = {
  ControlProduccionError,
  cerrarProduccion,
  eliminarMerma,
  guardarResultados,
  listarMermas,
  obtenerDetalleControl,
  prepararCierre,
  validarYGuardarMerma,
};
