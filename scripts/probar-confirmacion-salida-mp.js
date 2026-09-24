require('dotenv').config();

const { randomUUID } = require('crypto');

const sequelize = require('../database/database');
const {
  Bodega,
  CategoriaProducto,
  DetalleMovimiento,
  FormulaComponente,
  FormulaProducto,
  MovimientoInventario,
  OrdenProduccion,
  OrdenProduccionDetalle,
  OrdenProduccionSimulacion,
  OrdenProduccionSimulacionDetalle,
  OrdenProduccionSimulacionLote,
  Producto,
  Usuario,
} = require('../models');
const {
  OrdenProduccionError,
  confirmarSalidaMp,
  obtenerSaldosLotes,
  simularOrden,
} = require('../services/produccion/orden-produccion.service');

const numeroPrueba = (prefijo) => `${prefijo}-${randomUUID().slice(0, 8)}`;

const crearMovimiento = async ({
  tipoDocumento,
  producto,
  bodega,
  usuario,
  cantidad,
  lote,
  fechaVencimiento = '2027-12-31',
  transaction,
}) => {
  const movimiento = await MovimientoInventario.create(
    {
      tipoDocumento,
      numeroDocumento: numeroPrueba(`${tipoDocumento}-TEST`),
      fecha: new Date(),
      bodegaId: bodega.id,
      estado: 'APLICADO',
      origen: 'PRUEBA_OT',
      origenId: randomUUID(),
      usuarioId: usuario.id,
      observaciones: 'Movimiento temporal de prueba transaccional',
    },
    { transaction },
  );
  await DetalleMovimiento.create(
    {
      movimientoInventarioId: movimiento.id,
      productoId: producto.id,
      unidadMedidaId: producto.unidadMedidaId,
      cantidad,
      lote,
      loteProveedor: lote,
      fechaVencimiento,
    },
    { transaction },
  );
  return movimiento;
};

const crearOrden = async ({ numero, pt, usuario, transaction }) => {
  const orden = await OrdenProduccion.create(
    {
      numero,
      fecha: new Date().toISOString().slice(0, 10),
      usuarioId: usuario.id,
      estado: 'BORRADOR',
    },
    { transaction },
  );
  await OrdenProduccionDetalle.create(
    {
      ordenProduccionId: orden.id,
      productoTerminadoId: pt.id,
      cantidad: 1,
    },
    { transaction },
  );
  return orden;
};

const loteSeleccionadoDeOrden = (ordenId, transaction) =>
  OrdenProduccionSimulacionLote.findOne({
    include: [
      {
        model: OrdenProduccionSimulacionDetalle,
        as: 'detalle',
        required: true,
        include: [
          {
            model: OrdenProduccionSimulacion,
            as: 'simulacion',
            required: true,
            where: { ordenProduccionId: ordenId },
          },
        ],
      },
    ],
    transaction,
  });

const restaurarSecuenciaSalida = async () => {
  await sequelize.query(
    `SELECT setval(
       'movimientos_sa_numero_seq',
       COALESCE((
         SELECT MAX((regexp_match(numero_documento, '^SA-([0-9]+)$'))[1]::bigint)
         FROM movimientos_inventario
         WHERE tipo_documento = 'SA' AND numero_documento ~ '^SA-[0-9]+$'
       ), 0) + 1,
       false
     )`,
  );
};

const ejecutar = async () => {
  const transaction = await sequelize.transaction();
  try {
    const usuario = await Usuario.findOne({ where: { estado: true }, transaction });
    const bodega = await Bodega.findOne({ where: { estado: true }, transaction });
    const productos = await Producto.findAll({
      where: { estado: true },
      include: [{ model: CategoriaProducto, as: 'categoriaProducto' }],
      transaction,
    });
    const formulasActivas = await FormulaProducto.findAll({
      where: { activo: true },
      transaction,
    });
    if (!usuario || !bodega) throw new Error('Se requiere un usuario y una bodega activos');

    const ptConFormula = new Set(formulasActivas.map((formula) => formula.productoTerminadoId));
    const pt = productos.find(
      (producto) => producto.tipoProducto === 'PT' && !ptConFormula.has(producto.id),
    );
    const componente = productos.find(
      (producto) =>
        ['MP', 'INSUMO', 'EMPAQUE'].includes(producto.tipoProducto) &&
        !(
          producto.tipoProducto === 'MP' &&
          (producto.categoriaProducto?.codigo === 'MP-CAR' ||
            producto.categoriaProducto?.nombre?.trim().toUpperCase() === 'MP CÁRNICAS')
        ),
    );
    if (!pt || !componente) throw new Error('No hay catálogo disponible para la prueba');

    const formula = await FormulaProducto.create(
      { productoTerminadoId: pt.id, activo: true },
      { transaction },
    );
    await FormulaComponente.create(
      {
        formulaProductoId: formula.id,
        productoId: componente.id,
        cantidad: 2,
        unidadMedidaId: componente.unidadMedidaId,
        orden: 1,
      },
      { transaction },
    );
    const lote = `LOTE-TEST-${randomUUID().slice(0, 6)}`;
    await crearMovimiento({
      tipoDocumento: 'EN',
      producto: componente,
      bodega,
      usuario,
      cantidad: 10,
      lote,
      transaction,
    });

    const ordenExitosa = await crearOrden({
      numero: numeroPrueba('OP-TEST-OK'),
      pt,
      usuario,
      transaction,
    });
    await simularOrden(ordenExitosa, transaction);
    const loteSalidaExitosa = await loteSeleccionadoDeOrden(ordenExitosa.id, transaction);
    if (!loteSalidaExitosa) throw new Error('La simulación exitosa no seleccionó un lote');
    const movimientoSalida = await confirmarSalidaMp(ordenExitosa, usuario.id, transaction);
    const saldosTrasSalida = await obtenerSaldosLotes([componente.id], transaction);
    const saldo = saldosTrasSalida.find(
      (item) =>
        item.bodegaId === loteSalidaExitosa.bodegaId &&
        item.lote === loteSalidaExitosa.lote &&
        item.fechaVencimiento === loteSalidaExitosa.fechaVencimiento,
    );
    const saldoEsperado =
      Number(loteSalidaExitosa.saldoDisponible) - Number(loteSalidaExitosa.cantidad);
    if (ordenExitosa.estado !== 'EN_PRODUCCION' || Number(saldo?.saldo) !== saldoEsperado) {
      throw new Error(
        `La salida exitosa no actualizó correctamente estado o saldo: ${JSON.stringify({
          estado: ordenExitosa.estado,
          saldoEsperado,
          saldoEncontrado: saldo?.saldo ?? null,
          saldosTrasSalida,
        })}`,
      );
    }

    let dobleSalidaBloqueada = false;
    try {
      await confirmarSalidaMp(ordenExitosa, usuario.id, transaction);
    } catch (error) {
      dobleSalidaBloqueada = error instanceof OrdenProduccionError && error.status === 409;
    }
    if (!dobleSalidaBloqueada) throw new Error('No se bloqueó la doble salida');

    const ordenSinSaldo = await crearOrden({
      numero: numeroPrueba('OP-SINSALDO'),
      pt,
      usuario,
      transaction,
    });
    await simularOrden(ordenSinSaldo, transaction);
    const loteSinSaldo = await loteSeleccionadoDeOrden(ordenSinSaldo.id, transaction);
    if (!loteSinSaldo) throw new Error('La segunda simulación no seleccionó un lote');
    const consumoPosterior = Number(loteSinSaldo.saldoDisponible) - 1;
    if (!(consumoPosterior > 0)) {
      throw new Error('El lote elegido no permite preparar la prueba de saldo insuficiente');
    }
    await crearMovimiento({
      tipoDocumento: 'SA',
      producto: componente,
      bodega: { id: loteSinSaldo.bodegaId },
      usuario,
      cantidad: consumoPosterior,
      lote: loteSinSaldo.lote,
      fechaVencimiento: loteSinSaldo.fechaVencimiento,
      transaction,
    });
    let faltanteDetectado = false;
    try {
      await confirmarSalidaMp(ordenSinSaldo, usuario.id, transaction);
    } catch (error) {
      faltanteDetectado =
        error instanceof OrdenProduccionError &&
        error.status === 409 &&
        Array.isArray(error.details) &&
        error.details.length > 0;
    }
    const salidaInvalida = await MovimientoInventario.findOne({
      where: { origen: 'OT', origenId: ordenSinSaldo.id },
      transaction,
    });
    if (!faltanteDetectado || salidaInvalida) {
      throw new Error('La confirmación sin saldo no se rechazó de forma atómica');
    }

    console.log(
      JSON.stringify({
        salidaExitosa: movimientoSalida.numeroDocumento,
        saldoFinalEsperado: saldoEsperado,
        dobleSalidaBloqueada,
        faltanteDetectado,
        movimientoInvalidoGenerado: Boolean(salidaInvalida),
      }),
    );
  } finally {
    await transaction.rollback();
    await restaurarSecuenciaSalida();
    await sequelize.close();
  }
};

ejecutar().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
