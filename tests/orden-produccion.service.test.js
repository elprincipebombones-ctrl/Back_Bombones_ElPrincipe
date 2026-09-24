const assert = require('node:assert/strict');
const test = require('node:test');

const { asignarLotes, ordenarFefo } = require('../services/produccion/orden-produccion.service');

test('FEFO deja los lotes sin vencimiento al final', () => {
  const lotes = ordenarFefo([
    { productoId: 'a', lote: 'SIN-FECHA', fechaVencimiento: null },
    { productoId: 'a', lote: 'L2', fechaVencimiento: '2027-02-01' },
    { productoId: 'a', lote: 'L1', fechaVencimiento: '2027-01-01' },
  ]);
  assert.deepEqual(
    lotes.map((lote) => lote.lote),
    ['L1', 'L2', 'SIN-FECHA'],
  );
});

test('una familia cárnica prioriza refrigerado antes que congelado', () => {
  const productos = new Map([
    ['refrigerado', { condicionTermica: { codigo: 'REFRIGERADO' } }],
    ['congelado', { condicionTermica: { codigo: 'CONGELADO' } }],
  ]);
  const lotes = ordenarFefo(
    [
      {
        productoId: 'congelado',
        lote: 'C1',
        fechaVencimiento: '2026-10-01',
      },
      {
        productoId: 'refrigerado',
        lote: 'R1',
        fechaVencimiento: '2026-11-01',
      },
    ],
    productos,
  );
  assert.equal(lotes[0].productoId, 'refrigerado');
});

test('divide una necesidad entre varios lotes sin exceder sus saldos', () => {
  const resultado = asignarLotes(
    [
      { productoId: 'a', lote: 'A', bodegaId: 'b', saldo: 60 },
      { productoId: 'a', lote: 'B', bodegaId: 'b', saldo: 80 },
    ],
    100,
  );
  assert.equal(resultado.faltante, 0);
  assert.deepEqual(
    resultado.asignaciones.map((asignacion) => asignacion.cantidad),
    [60, 40],
  );
});

test('informa faltante cuando el saldo total no alcanza', () => {
  const resultado = asignarLotes([{ productoId: 'a', lote: 'A', bodegaId: 'b', saldo: 25 }], 40);
  assert.equal(resultado.asignaciones[0].cantidad, 25);
  assert.equal(resultado.faltante, 15);
});
