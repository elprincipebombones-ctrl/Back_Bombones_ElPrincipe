const { QueryTypes } = require('sequelize');
const {
  sequelize,
  PedidoVenta,
  PedidoVentaDetalle,
  Proveedor,
  Producto,
  UnidadMedida,
} = require('../../models');
const stock = require('./stock-pedidos.service');

const error = (message, status = 422) => Object.assign(new Error(message), { status });
const incluir = [
  {
    model: Proveedor,
    as: 'cliente',
    attributes: [
      'id',
      'tipoDocumento',
      'numeroDocumento',
      'razonSocial',
      'nombreComercial',
      'telefono',
      'direccion',
      'email',
    ],
  },
  {
    model: PedidoVentaDetalle,
    as: 'detalles',
    include: [
      { model: Producto, as: 'producto', attributes: ['id', 'codigo', 'nombre'] },
      { model: UnidadMedida, as: 'unidadMedida', attributes: ['id', 'simbolo', 'nombre'] },
    ],
  },
];

async function clienteValido(clienteId, transaction) {
  const cliente = await Proveedor.findByPk(clienteId, { transaction });
  if (!cliente || !cliente.esCliente || !cliente.estado) {
    throw error('Seleccione un cliente activo', 422);
  }
  return cliente;
}

async function prepararDetalles(detalles, transaction, obligatorio = false) {
  if (!Array.isArray(detalles) || detalles.length > 500 || (obligatorio && !detalles.length)) {
    throw error('El pedido requiere entre 1 y 500 productos');
  }
  const ids = new Set();
  for (const detalle of detalles) {
    if (!detalle.productoId || ids.has(detalle.productoId)) {
      throw error('No repita productos dentro del pedido');
    }
    ids.add(detalle.productoId);
    if (!/^\d{1,12}(\.\d{1,3})?$/.test(String(detalle.cantidad)) || Number(detalle.cantidad) <= 0) {
      throw error('Cada cantidad debe ser mayor que cero y tener máximo tres decimales');
    }
  }
  const productos = await Producto.findAll({
    where: { id: [...ids], tipoProducto: 'PT', estado: true },
    transaction,
  });
  if (productos.length !== ids.size) throw error('Uno o más productos no son PT activos');
  const porId = new Map(productos.map((p) => [p.id, p]));
  return detalles.map((d) => ({
    productoId: d.productoId,
    cantidad: d.cantidad,
    unidadMedidaId: porId.get(d.productoId).unidadMedidaId,
  }));
}

async function obtener(id, transaction = null) {
  const pedido = await PedidoVenta.findByPk(id, { include: incluir, transaction });
  if (!pedido) throw error('Pedido no encontrado', 404);
  return pedido;
}

async function listar() {
  return PedidoVenta.findAll({
    include: incluir,
    order: [
      ['fecha', 'DESC'],
      ['numero', 'DESC'],
    ],
  });
}

async function crear(body, usuarioId) {
  return sequelize.transaction(async (transaction) => {
    await clienteValido(body.clienteId, transaction);
    const detalles = await prepararDetalles(body.detalles || [], transaction);
    const [secuencia] = await sequelize.query(
      "SELECT nextval('pedidos_venta_numero_seq')::bigint AS numero",
      { type: QueryTypes.SELECT, transaction },
    );
    const numero = `PED-${String(secuencia.numero).padStart(6, '0')}`;
    const pedido = await PedidoVenta.create(
      {
        numero,
        fecha: new Date(),
        clienteId: body.clienteId,
        usuarioId,
        observaciones: body.observaciones?.trim() || null,
        estado: 'BORRADOR',
      },
      { transaction },
    );
    if (detalles.length) {
      await PedidoVentaDetalle.bulkCreate(
        detalles.map((d) => ({ ...d, pedidoVentaId: pedido.id })),
        { transaction },
      );
    }
    return obtener(pedido.id, transaction);
  });
}

async function actualizar(id, body) {
  return sequelize.transaction(async (transaction) => {
    const pedido = await PedidoVenta.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!pedido) throw error('Pedido no encontrado', 404);
    if (pedido.estado !== 'BORRADOR') throw error('Solo se puede editar un borrador', 409);
    if (body.clienteId !== undefined) await clienteValido(body.clienteId, transaction);
    const detalles =
      body.detalles === undefined ? null : await prepararDetalles(body.detalles, transaction);
    await pedido.update(
      {
        ...(body.clienteId !== undefined ? { clienteId: body.clienteId } : {}),
        ...(body.observaciones !== undefined
          ? { observaciones: body.observaciones?.trim() || null }
          : {}),
      },
      { transaction },
    );
    if (detalles) {
      await PedidoVentaDetalle.destroy({ where: { pedidoVentaId: id }, transaction });
      if (detalles.length) {
        await PedidoVentaDetalle.bulkCreate(
          detalles.map((d) => ({ ...d, pedidoVentaId: id })),
          { transaction },
        );
      }
    }
    return obtener(id, transaction);
  });
}

async function confirmar(id) {
  return sequelize.transaction(async (transaction) => {
    const pedido = await PedidoVenta.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!pedido) throw error('Pedido no encontrado', 404);
    if (pedido.estado !== 'BORRADOR') throw error('Solo se puede confirmar un borrador', 409);
    await clienteValido(pedido.clienteId, transaction);
    const detalles = await PedidoVentaDetalle.findAll({
      where: { pedidoVentaId: id },
      transaction,
    });
    if (!detalles.length) throw error('Agregue al menos un producto antes de confirmar');
    await prepararDetalles(detalles, transaction, true);
    const disponibles = await stock.productosDisponibles(
      detalles.map((d) => d.productoId),
      transaction,
    );
    const porId = new Map(disponibles.map((p) => [p.id, p]));
    const faltantes = detalles.filter((d) => {
      const p = porId.get(d.productoId);
      return !p || p.stockIndeterminado || Number(d.cantidad) > p.stockDisponible;
    });
    if (faltantes.length)
      throw error('Stock insuficiente o indeterminado para uno o más productos', 409);
    await pedido.update({ estado: 'CONFIRMADO' }, { transaction });
    return obtener(id, transaction);
  });
}

async function cancelar(id, motivo, usuarioId) {
  if (!motivo || !motivo.trim()) throw error('El motivo de cancelación es obligatorio');
  return sequelize.transaction(async (transaction) => {
    const pedido = await PedidoVenta.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!pedido) throw error('Pedido no encontrado', 404);
    if (!['BORRADOR', 'CONFIRMADO'].includes(pedido.estado)) {
      throw error('El pedido ya está cancelado', 409);
    }
    await pedido.update(
      {
        estado: 'CANCELADO',
        fechaCancelacion: new Date(),
        usuarioCancelacionId: usuarioId,
        motivoCancelacion: motivo.trim(),
      },
      { transaction },
    );
    return obtener(id, transaction);
  });
}

module.exports = { obtener, listar, crear, actualizar, confirmar, cancelar };
