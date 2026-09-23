const assert = require('node:assert/strict');
const test = require('node:test');

const { calcularCantidadNormalizada } = require('../services/produccion/conversion-unidad.service');

test('convierte gramos a kilogramos usando el factor configurado', () => {
  assert.equal(calcularCantidadNormalizada(5, 0.001), 0.005);
});

test('convierte miligramos a kilogramos usando el factor configurado', () => {
  assert.equal(calcularCantidadNormalizada(5000, 0.000001), 0.005);
});

test('mantiene la cantidad cuando la unidad ya es la unidad base', () => {
  assert.equal(calcularCantidadNormalizada(2.5, 1), 2.5);
});

test('rechaza cantidades y factores no positivos', () => {
  assert.throws(() => calcularCantidadNormalizada(0, 1));
  assert.throws(() => calcularCantidadNormalizada(1, 0));
});
