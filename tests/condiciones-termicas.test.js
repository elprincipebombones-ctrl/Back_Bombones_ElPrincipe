const test = require('node:test');
const assert = require('node:assert/strict');

const {
  evaluarTemperatura,
  describirRango,
} = require('../services/recepcion/condiciones-termicas.service');

const refrigerado = {
  codigo: 'REFRIGERADO',
  temperaturaMinima: 0,
  temperaturaMaxima: 4,
};

const congelado = {
  codigo: 'CONGELADO',
  temperaturaMinima: null,
  temperaturaMaxima: 0,
};

test('refrigerado incluye ambos límites', () => {
  assert.equal(evaluarTemperatura(refrigerado, 0), true);
  assert.equal(evaluarTemperatura(refrigerado, 4), true);
  assert.equal(evaluarTemperatura(refrigerado, -0.01), false);
  assert.equal(evaluarTemperatura(refrigerado, 4.01), false);
  assert.equal(describirRango(refrigerado), '0 a 4 °C');
});

test('congelado exige un valor estrictamente menor al máximo', () => {
  assert.equal(evaluarTemperatura(congelado, -0.01), true);
  assert.equal(evaluarTemperatura(congelado, 0), false);
  assert.equal(evaluarTemperatura(congelado, 1), false);
  assert.equal(describirRango(congelado), '< 0 °C');
});

test('la evaluación utiliza los límites recibidos y no rangos fijos', () => {
  const configurada = {
    codigo: 'REFRIGERADO',
    temperaturaMinima: 2,
    temperaturaMaxima: 6,
  };

  assert.equal(evaluarTemperatura(configurada, 1), false);
  assert.equal(evaluarTemperatura(configurada, 5), true);
});
