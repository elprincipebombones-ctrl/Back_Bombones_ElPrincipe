const stock = require('./stock-pedidos.service');
const error = (message, status = 422) => Object.assign(new Error(message), { status });
const clave = (lote) => JSON.stringify([lote.bodegaId, lote.lote, lote.fechaVencimiento]);
const cantidadValida = (cantidad) =>
  /^\d{1,12}(\.\d{1,3})?$/.test(String(cantidad)) && Number(cantidad) > 0;
const miles = (cantidad) => {
  const [entero, decimal = ''] = String(cantidad).split('.');
  return BigInt(entero) * 1000n + BigInt(decimal.padEnd(3, '0'));
};

function normalizarSeleccion(detalle) {
  if (
    !Array.isArray(detalle.seleccionLotes) ||
    !detalle.seleccionLotes.length ||
    detalle.seleccionLotes.length > 500
  ) {
    throw error('Seleccione los lotes y bodegas de cada producto antes de guardar o confirmar');
  }
  const vistos = new Set();
  let total = 0n;
  const seleccion = detalle.seleccionLotes.map((lote) => {
    if (
      !lote ||
      !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(lote.bodegaId) ||
      !(lote.lote === null || (typeof lote.lote === 'string' && lote.lote.length <= 100)) ||
      !(
        lote.fechaVencimiento === null ||
        (typeof lote.fechaVencimiento === 'string' &&
          /^\d{4}-\d{2}-\d{2}$/.test(lote.fechaVencimiento))
      ) ||
      !cantidadValida(lote.cantidad)
    ) {
      throw error('La selección de lote, bodega, vencimiento o cantidad no es válida');
    }
    const key = clave(lote);
    if (vistos.has(key))
      throw error('No repita el mismo lote, vencimiento y bodega dentro del producto');
    vistos.add(key);
    total += miles(lote.cantidad);
    return {
      bodegaId: lote.bodegaId,
      lote: lote.lote,
      fechaVencimiento: lote.fechaVencimiento,
      cantidad: Number(lote.cantidad),
    };
  });
  if (!cantidadValida(detalle.cantidad) || total !== miles(detalle.cantidad)) {
    throw error('La suma de las cantidades por lote debe coincidir con la cantidad del producto');
  }
  return seleccion;
}

async function validarSaldos(detalles, transaction) {
  const productos = await stock.productosDisponibles(
    detalles.map((d) => d.productoId),
    transaction,
  );
  const porProducto = new Map(productos.map((p) => [p.id, p]));
  for (const detalle of detalles) {
    const producto = porProducto.get(detalle.productoId);
    if (!producto || producto.stockIndeterminado)
      throw error('Stock insuficiente o indeterminado para uno o más productos', 409);
    normalizarSeleccion(detalle);
    for (const elegido of detalle.seleccionLotes) {
      const disponible = producto.lotes.find((lote) => clave(lote) === clave(elegido));
      if (!disponible || elegido.cantidad > disponible.disponible) {
        throw error(
          `Stock insuficiente para ${producto.nombre}, lote ${elegido.lote ?? 'sin lote'} en la bodega elegida. Actualice el stock y revise la cantidad; no se utilizará otro lote.`,
          409,
        );
      }
      elegido.bodega = disponible.bodega;
    }
  }
  return porProducto;
}

module.exports = { clave, normalizarSeleccion, validarSaldos };
