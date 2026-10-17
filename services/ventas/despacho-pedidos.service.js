const { randomUUID } = require('crypto');
const { QueryTypes } = require('sequelize');
const { sequelize, Bodega, MovimientoInventario, DetalleMovimiento } = require('../../models');
const { clave, validarSaldos } = require('./seleccion-lotes.service');

async function despachar(pedido, detalles, usuarioId, transaction) {
  // Compartir el bloqueo de bodegas con las operaciones manuales de inventario.
  // El saldo se vuelve a consultar después del bloqueo, dentro de la transacción.
  await Bodega.findAll({
    where: {
      id: [
        ...new Set(
          detalles.flatMap((detalle) => detalle.seleccionLotes.map((lote) => lote.bodegaId)),
        ),
      ],
    },
    order: [['id', 'ASC']],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  const porProducto = await validarSaldos(detalles, transaction);
  const porBodega = new Map();
  const fecha = new Date();
  for (const detalle of detalles) {
    const producto = porProducto.get(detalle.productoId);
    const despachos = [];
    for (const elegido of detalle.seleccionLotes) {
      const lote = producto.lotes.find((disponible) => clave(disponible) === clave(elegido));
      const cantidad = Number(elegido.cantidad);
      let grupo = porBodega.get(lote.bodegaId);
      if (!grupo) {
        grupo = {
          id: randomUUID(),
          movimientoId: randomUUID(),
          bodegaId: lote.bodegaId,
          detalles: [],
        };
        porBodega.set(lote.bodegaId, grupo);
      }
      despachos.push({
        despachoId: grupo.id,
        movimientoId: grupo.movimientoId,
        fecha: fecha.toISOString(),
        cantidad,
        lote: lote.lote,
        fechaVencimiento: lote.fechaVencimiento,
        bodegaId: lote.bodegaId,
        bodega: lote.bodega,
      });
      grupo.detalles.push({
        productoId: detalle.productoId,
        unidadMedidaId: detalle.unidadMedidaId,
        cantidad,
        lote: lote.lote,
        fechaVencimiento: lote.fechaVencimiento,
      });
    }
    await detalle.update({ despachos }, { transaction });
  }
  for (const grupo of porBodega.values()) {
    const [secuencia] = await sequelize.query(
      "SELECT nextval('movimientos_sa_numero_seq') AS numero",
      { type: QueryTypes.SELECT, transaction },
    );
    await MovimientoInventario.create(
      {
        id: grupo.movimientoId,
        tipoDocumento: 'SA',
        numeroDocumento: `SA-${String(secuencia.numero).padStart(6, '0')}`,
        fecha,
        bodegaId: grupo.bodegaId,
        estado: 'APLICADO',
        origen: 'PEDIDO_VENTA',
        origenId: grupo.id,
        usuarioId,
        observaciones: `Despacho del pedido ${pedido.numero} (${pedido.id})`,
      },
      { transaction },
    );
    await DetalleMovimiento.bulkCreate(
      grupo.detalles.map((detalle) => ({
        ...detalle,
        movimientoInventarioId: grupo.movimientoId,
        sentido: 'SALIDA',
      })),
      { transaction },
    );
  }
}

module.exports = { despachar };
