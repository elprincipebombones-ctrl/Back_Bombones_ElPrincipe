const { sequelize, Producto, Bodega, ConfiguracionStock } = require('../../models');
const { miles, decimal } = require('./operaciones.service');
const error = (message, status = 422) => Object.assign(new Error(message), { status });

async function guardar(productoId, bodegaId, body, usuarioId) {
  const minimo = miles(body.stockMinimo);
  const reorden = miles(body.puntoReorden);
  const maximo = body.stockMaximo === null || body.stockMaximo === undefined ? null : miles(body.stockMaximo);
  if (minimo > reorden) throw error('stockMinimo no puede ser mayor que puntoReorden');
  if (maximo !== null && reorden > maximo) throw error('puntoReorden no puede ser mayor que stockMaximo');
  return sequelize.transaction(async (transaction) => {
    const [producto, bodega] = await Promise.all([
      Producto.findByPk(productoId, { transaction }), Bodega.findByPk(bodegaId, { transaction }),
    ]);
    if (!producto) throw error('Producto no encontrado', 404);
    if (!bodega) throw error('Bodega no encontrada', 404);
    if (!producto.estado || !bodega.estado) throw error('Producto y bodega deben estar activos');
    const valores = { productoId, bodegaId, stockMinimo: decimal(minimo), puntoReorden: decimal(reorden), stockMaximo: maximo === null ? null : decimal(maximo), activo: body.activo === undefined ? true : body.activo, usuarioId };
    const [configuracion] = await ConfiguracionStock.upsert(valores, { transaction, returning: true, conflictFields: ['producto_id', 'bodega_id'] });
    return configuracion;
  });
}
module.exports = { guardar };
