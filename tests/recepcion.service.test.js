const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validarDetalles,
  recepcionEsEditable,
  finalizarRecepcion,
} = require('../services/recepcion/recepcion.service');

const producto = (id, clasificacionMp, unidadMedidaId = `unidad-${id}`) => ({
  id,
  nombre: `Producto ${id}`,
  estado: true,
  unidadMedidaId,
  categoriaProducto: { clasificacionMp },
});

const modelosValidacion = (productos) => ({
  Producto: {
    findAll: async () => productos,
  },
  CategoriaProducto: {},
});

test('perecedero exige lote y vencimiento y conserva su unidad automática', async () => {
  const pollo = producto('pollo', 'PERECEDERA', 'kg');
  const base = {
    productoId: pollo.id,
    unidadMedidaId: pollo.unidadMedidaId,
    cantidadRecibida: 98,
  };

  await assert.rejects(
    validarDetalles([base], null, modelosValidacion([pollo])),
    /lote del proveedor y la fecha de vencimiento son obligatorios/i,
  );

  const [detalle] = await validarDetalles(
    [{ ...base, loteProveedor: 'ABC123', fechaVencimiento: '2026-09-15' }],
    null,
    modelosValidacion([pollo]),
  );
  assert.equal(detalle.unidadMedidaId, 'kg');
  assert.equal(detalle.loteProveedor, 'ABC123');
});

test('no perecedero permite lote y vencimiento vacíos', async () => {
  const empaque = producto('empaque', 'NO_PERECEDERA');
  const [detalle] = await validarDetalles(
    [
      {
        productoId: empaque.id,
        unidadMedidaId: empaque.unidadMedidaId,
        cantidadSolicitada: 20,
        cantidadRecibida: 20,
      },
    ],
    null,
    modelosValidacion([empaque]),
  );
  assert.equal(detalle.loteProveedor, null);
  assert.equal(detalle.fechaVencimiento, null);
});

const escenarioFinalizacion = ({ estado = 'EN_PROCESO', fallarDetalle = false } = {}) => {
  const state = { movimientos: [], detallesMovimiento: [] };
  const recepcion = {
    id: 'recepcion-1',
    numero: 'REC-000001',
    estado,
    bodegaId: 'bodega-1',
    detalles: [
      {
        productoId: 'pollo',
        unidadMedidaId: 'kg',
        cantidadRecibida: 98,
        loteProveedor: 'ABC123',
        fechaVencimiento: '2026-09-15',
        producto: producto('pollo', 'PERECEDERA', 'kg'),
      },
      {
        productoId: 'caja',
        unidadMedidaId: 'und',
        cantidadRecibida: 25,
        loteProveedor: null,
        fechaVencimiento: null,
        producto: producto('caja', 'NO_PERECEDERA', 'und'),
      },
    ],
    verificacion: {
      certificadoCalidad: true,
      plagas: false,
      rotuladoCorrecto: true,
      condicionesEmbalaje: true,
      aparienciaColorTextura: true,
      empaqueEmbalaje: true,
      olor: true,
    },
    async update(cambios) {
      Object.assign(this, cambios);
    },
  };
  let secuencia = 1;
  const database = {
    async query() {
      return [[{ consecutivo: secuencia++ }]];
    },
    async transaction(callback) {
      const snapshot = JSON.stringify({
        movimientos: state.movimientos,
        detallesMovimiento: state.detallesMovimiento,
        estado: recepcion.estado,
      });
      try {
        return await callback({ LOCK: { UPDATE: 'UPDATE' } });
      } catch (error) {
        const anterior = JSON.parse(snapshot);
        state.movimientos = anterior.movimientos;
        state.detallesMovimiento = anterior.detallesMovimiento;
        recepcion.estado = anterior.estado;
        throw error;
      }
    },
  };
  const models = {
    Recepcion: { findByPk: async () => recepcion },
    DetalleRecepcion: {},
    Producto: {},
    CategoriaProducto: {},
    VerificacionRecepcion: {},
    MovimientoInventario: {
      findOne: async () => state.movimientos[0] || null,
      create: async (datos) => {
        const movimiento = { id: 'movimiento-1', ...datos };
        state.movimientos.push(movimiento);
        return movimiento;
      },
    },
    DetalleMovimiento: {
      bulkCreate: async (datos) => {
        if (fallarDetalle) throw new Error('Fallo forzado');
        state.detallesMovimiento.push(...datos);
      },
    },
  };
  return { state, recepcion, database, models };
};

test('finaliza mezcla de productos en un solo EN con varios detalles', async () => {
  const escenario = escenarioFinalizacion();
  const resultado = await finalizarRecepcion({
    recepcionId: escenario.recepcion.id,
    usuarioId: 'usuario-1',
    database: escenario.database,
    models: escenario.models,
  });
  assert.equal(resultado.movimiento.numeroDocumento, 'EN-000001');
  assert.equal(escenario.state.movimientos.length, 1);
  assert.equal(escenario.state.detallesMovimiento.length, 2);
  assert.equal(escenario.state.detallesMovimiento[0].lote, 'ABC123');
  assert.equal(escenario.state.detallesMovimiento[0].fechaVencimiento, '2026-09-15');
  assert.equal(escenario.recepcion.estado, 'TERMINADA');
});

test('impide finalizar dos veces y no duplica el movimiento', async () => {
  const escenario = escenarioFinalizacion();
  await finalizarRecepcion({
    recepcionId: escenario.recepcion.id,
    usuarioId: 'usuario-1',
    database: escenario.database,
    models: escenario.models,
  });
  await assert.rejects(
    finalizarRecepcion({
      recepcionId: escenario.recepcion.id,
      usuarioId: 'usuario-1',
      database: escenario.database,
      models: escenario.models,
    }),
    /ya está terminada/i,
  );
  assert.equal(escenario.state.movimientos.length, 1);
});

test('rechaza una recepción terminada como operación de sólo lectura', async () => {
  const escenario = escenarioFinalizacion({ estado: 'TERMINADA' });
  await assert.rejects(
    finalizarRecepcion({
      recepcionId: escenario.recepcion.id,
      usuarioId: 'usuario-1',
      database: escenario.database,
      models: escenario.models,
    }),
    /ya está terminada/i,
  );
});

test('una recepción terminada no admite edición', () => {
  assert.equal(recepcionEsEditable({ estado: 'TERMINADA' }), false);
  assert.equal(recepcionEsEditable({ estado: 'EN_PROCESO' }), true);
});

test('revierte movimiento y estado cuando falla un detalle de inventario', async () => {
  const escenario = escenarioFinalizacion({ fallarDetalle: true });
  await assert.rejects(
    finalizarRecepcion({
      recepcionId: escenario.recepcion.id,
      usuarioId: 'usuario-1',
      database: escenario.database,
      models: escenario.models,
    }),
    /Fallo forzado/,
  );
  assert.equal(escenario.state.movimientos.length, 0);
  assert.equal(escenario.state.detallesMovimiento.length, 0);
  assert.equal(escenario.recepcion.estado, 'EN_PROCESO');
});
