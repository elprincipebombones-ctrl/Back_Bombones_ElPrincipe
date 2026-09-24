require('dotenv').config();

const { randomUUID } = require('crypto');
const { Op } = require('sequelize');

const sequelize = require('../database/database');
const {
  Bodega,
  DetalleMovimiento,
  MermaProduccion,
  MotivoMerma,
  MovimientoInventario,
  OrdenProduccion,
  OrdenProduccionDetalle,
  Producto,
  ResultadoProduccion,
  Usuario,
} = require('../models');
const {
  ControlProduccionError,
  eliminarMerma,
  guardarResultados,
  obtenerDetalleControl,
  validarYGuardarMerma,
} = require('../services/produccion/control-produccion.service');

const ejecutar = async () => {
  const transaction = await sequelize.transaction();
  try {
    const usuario = await Usuario.findOne({ where: { estado: true }, transaction });
    const bodega = await Bodega.findOne({ where: { estado: true }, transaction });
    const pt = await Producto.findOne({
      where: { estado: true, tipoProducto: 'PT' },
      transaction,
    });
    const material = await Producto.findOne({
      where: { estado: true, tipoProducto: { [Op.ne]: 'PT' } },
      transaction,
    });
    const motivo = await MotivoMerma.findOne({ where: { activo: true }, transaction });
    if (!usuario || !bodega || !pt || !material || !motivo) {
      throw new Error('Faltan datos maestros para ejecutar la prueba de Control de Producción');
    }

    const sufijo = randomUUID().slice(0, 8);
    const orden = await OrdenProduccion.create(
      {
        numero: `OP-CTRL-${sufijo}`,
        fecha: new Date(),
        usuarioId: usuario.id,
        estado: 'EN_PRODUCCION',
        fechaSalidaMp: new Date(),
        usuarioSalidaMpId: usuario.id,
      },
      { transaction },
    );
    await OrdenProduccionDetalle.create(
      {
        ordenProduccionId: orden.id,
        productoTerminadoId: pt.id,
        cantidad: 10,
      },
      { transaction },
    );
    const movimiento = await MovimientoInventario.create(
      {
        tipoDocumento: 'SA',
        numeroDocumento: `SA-CTRL-${sufijo}`,
        fecha: new Date(),
        bodegaId: bodega.id,
        estado: 'APLICADO',
        origen: 'OT',
        origenId: orden.id,
        usuarioId: usuario.id,
        observaciones: 'Prueba transaccional de Control de Producción',
      },
      { transaction },
    );
    await DetalleMovimiento.create(
      {
        movimientoInventarioId: movimiento.id,
        productoId: material.id,
        unidadMedidaId: material.unidadMedidaId,
        cantidad: 10,
        lote: `CTRL-${sufijo}`,
      },
      { transaction },
    );
    await orden.update({ movimientoSalidaId: movimiento.id }, { transaction });

    await guardarResultados(
      orden.id,
      [{ productoTerminadoId: pt.id, cantidadProducida: 7.8 }],
      transaction,
    );
    const mermaMp = await validarYGuardarMerma({
      ordenId: orden.id,
      datos: {
        tipoMerma: 'MP',
        productoId: material.id,
        cantidad: 2,
        motivoMermaId: motivo.id,
        observacion: 'Prueba MP',
      },
      usuarioId: usuario.id,
      transaction,
    });
    await validarYGuardarMerma({
      ordenId: orden.id,
      datos: {
        tipoMerma: 'PT',
        productoId: pt.id,
        cantidad: 2,
        motivoMermaId: motivo.id,
        observacion: 'Prueba PT',
      },
      usuarioId: usuario.id,
      transaction,
    });
    await validarYGuardarMerma({
      ordenId: orden.id,
      datos: {
        tipoMerma: 'PT',
        productoId: pt.id,
        cantidad: 0.2,
        motivoMermaId: motivo.id,
        observacion: 'Prueba PT en el límite exacto',
      },
      usuarioId: usuario.id,
      transaction,
    });

    let limiteMpBloqueado = false;
    let limitePtBloqueado = false;
    let limiteProduccionBloqueado = false;
    let detalleErrorPtCorrecto = false;
    try {
      await validarYGuardarMerma({
        ordenId: orden.id,
        datos: {
          tipoMerma: 'MP',
          productoId: material.id,
          cantidad: 9,
          motivoMermaId: motivo.id,
        },
        usuarioId: usuario.id,
        transaction,
      });
    } catch (error) {
      limiteMpBloqueado = error instanceof ControlProduccionError;
    }
    try {
      await validarYGuardarMerma({
        ordenId: orden.id,
        datos: {
          tipoMerma: 'PT',
          productoId: pt.id,
          cantidad: 0.000001,
          motivoMermaId: motivo.id,
        },
        usuarioId: usuario.id,
        transaction,
      });
    } catch (error) {
      limitePtBloqueado = error instanceof ControlProduccionError;
      detalleErrorPtCorrecto =
        error.details?.planeado === 10 &&
        error.details?.producido === 7.8 &&
        error.details?.mermaRegistrada === 2.2 &&
        error.details?.mermaMaximaDisponible === 0;
    }
    try {
      await guardarResultados(
        orden.id,
        [{ productoTerminadoId: pt.id, cantidadProducida: 7.800001 }],
        transaction,
      );
    } catch (error) {
      limiteProduccionBloqueado = error instanceof ControlProduccionError;
    }

    const detalleConIndicadores = await obtenerDetalleControl(orden.id, transaction);
    const indicadorMp = detalleConIndicadores.mermas.find(
      (item) => item.tipoMerma === 'MP',
    )?.indicadores;
    const indicadorPt = detalleConIndicadores.mermas.find(
      (item) => item.tipoMerma === 'PT',
    )?.indicadores;
    const indicadoresMpCorrectos =
      indicadorMp?.consumidoOt === 10 &&
      indicadorMp?.mermaAcumulada === 2 &&
      indicadorMp?.aprovechado === 8 &&
      indicadorMp?.porcentajeMerma === 20 &&
      indicadorMp?.porcentajeAprovechamiento === 80;
    const indicadoresPtCorrectos =
      indicadorPt?.planeado === 10 &&
      indicadorPt?.producido === 7.8 &&
      indicadorPt?.mermaAcumulada === 2.2 &&
      indicadorPt?.porcentajeMerma === 22;

    await eliminarMerma(orden.id, mermaMp.id, transaction);
    const detalle = await obtenerDetalleControl(orden.id, transaction);
    const movimientos = await MovimientoInventario.count({
      where: { origen: 'OT', origenId: orden.id },
      transaction,
    });
    const resultados = await ResultadoProduccion.count({
      where: { ordenProduccionId: orden.id },
      transaction,
    });
    const mermas = await MermaProduccion.count({
      where: { ordenProduccionId: orden.id },
      transaction,
    });

    console.log(
      JSON.stringify({
        produccionGuardada: resultados === 1 && detalle.resultados[0].cantidadProducida === 7.8,
        limiteMpBloqueado,
        limitePtBloqueado,
        detalleErrorPtCorrecto,
        limiteProduccionBloqueado,
        limiteExactoAceptado: mermas === 2,
        indicadoresMpCorrectos,
        indicadoresPtCorrectos,
        mermaEliminada: mermas === 2,
        sinMovimientoAdicional: movimientos === 1,
      }),
    );
  } finally {
    await transaction.rollback();
    await sequelize.close();
  }
};

ejecutar().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
