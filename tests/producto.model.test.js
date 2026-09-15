const test = require('node:test');
const assert = require('node:assert/strict');
const Producto = require('../models/Recepcion/Producto');

const productoBase = {
  codigo: 'PRUEBA-TIPO',
  nombre: 'Producto de prueba',
  categoriaProductoId: '11111111-1111-4111-8111-111111111111',
  unidadMedidaId: '22222222-2222-4222-8222-222222222222',
  estado: true,
};

test('acepta los cuatro tipos de producto definidos', async () => {
  for (const tipoProducto of ['MP', 'INSUMO', 'EMPAQUE', 'PT']) {
    await Producto.build({ ...productoBase, tipoProducto }).validate();
  }
});

test('rechaza un tipo de producto no permitido', async () => {
  await assert.rejects(
    Producto.build({ ...productoBase, tipoProducto: 'OTRO' }).validate(),
    /Validation isIn on tipoProducto failed/,
  );
});

test('exige tipo de producto', async () => {
  await assert.rejects(
    Producto.build(productoBase).validate(),
    /Producto.tipoProducto cannot be null/,
  );
});
