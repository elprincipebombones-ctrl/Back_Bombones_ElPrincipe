const assert = require('node:assert/strict');
const test = require('node:test');

const { calcularPorcentaje } = require('../services/calidad/campos-calculados.service');

test('calcula un porcentaje con multiplicador configurable', () => {
  assert.equal(calcularPorcentaje(9, 10, 100), 90);
  assert.equal(calcularPorcentaje(1, 4, 1000), 250);
});

test('devuelve null si falta una fuente o el denominador es cero', () => {
  assert.equal(calcularPorcentaje(null, 10, 100), null);
  assert.equal(calcularPorcentaje(10, undefined, 100), null);
  assert.equal(calcularPorcentaje(10, 0, 100), null);
});
