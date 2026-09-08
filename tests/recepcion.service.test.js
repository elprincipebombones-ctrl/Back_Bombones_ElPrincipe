const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validarDetalles,
  recepcionEsEditable,
  finalizarRecepcion,
} = require('../services/recepcion/recepcion.service');

const producto = (id, reglas, unidadMedidaId = `unidad-${id}`) => ({
  id,
  nombre: `Producto ${id}`,
  estado: true,
  unidadMedidaId,
  categoriaProducto: reglas,
});

const carnica = {
  requiereLote: true,
  requiereFechaVencimiento: true,
  requiereTemperatura: true,
};
const noCarnica = {
  requiereLote: true,
  requiereFechaVencimiento: true,
  requiereTemperatura: false,
};
const insumo = {
  requiereLote: true,
  requiereFechaVencimiento: false,
  requiereTemperatura: false,
};
const empaque = {
  requiereLote: true,
  requiereFechaVencimiento: true,
  requiereTemperatura: false,
};

const modelosValidacion = (productos) => ({
  Producto: {
    findAll: async () => productos,
  },
  CategoriaProducto: {},
});

test('MP cárnica exige lote y vencimiento y toma la unidad del producto', async () => {
  const pollo = producto('pollo', carnica, 'kg');
  const base = {
    productoId: pollo.id,
    cantidadRecibida: 98,
  };

  await assert.rejects(validarDetalles([base], null, modelosValidacion([pollo])), /lote/i);
  await assert.rejects(
    validarDetalles([{ ...base, loteProveedor: 'ABC123' }], null, modelosValidacion([pollo])),
    /fecha de vencimiento/i,
  );

  const [detalle] = await validarDetalles(
    [{ ...base, loteProveedor: 'ABC123', fechaVencimiento: '2026-09-15' }],
    null,
    modelosValidacion([pollo]),
  );
  assert.equal(detalle.unidadMedidaId, 'kg');
  assert.equal(detalle.loteProveedor, 'ABC123');
});

test('MP no cárnica exige lote y vencimiento', async () => {
  const productoNoCarnico = producto('no-carnico', noCarnica);
  await assert.rejects(
    validarDetalles(
      [{ productoId: productoNoCarnico.id, cantidadRecibida: 20 }],
      null,
      modelosValidacion([productoNoCarnico]),
    ),
    /lote/i,
  );
  await assert.rejects(
    validarDetalles(
      [{ productoId: productoNoCarnico.id, cantidadRecibida: 20, loteProveedor: 'L-1' }],
      null,
      modelosValidacion([productoNoCarnico]),
    ),
    /fecha de vencimiento/i,
  );
});

test('insumo exige lote y permite vencimiento vacío', async () => {
  const productoInsumo = producto('insumo', insumo);
  const [detalle] = await validarDetalles(
    [
      {
        productoId: productoInsumo.id,
        cantidadSolicitada: 20,
        cantidadRecibida: 20,
        loteProveedor: 'INS-1',
      },
    ],
    null,
    modelosValidacion([productoInsumo]),
  );
  assert.equal(detalle.loteProveedor, 'INS-1');
  assert.equal(detalle.fechaVencimiento, null);
});

test('material de empaque exige lote y vencimiento', async () => {
  const material = producto('empaque', empaque);
  await assert.rejects(
    validarDetalles(
      [{ productoId: material.id, cantidadRecibida: 10, loteProveedor: 'EMP-1' }],
      null,
      modelosValidacion([material]),
    ),
    /fecha de vencimiento/i,
  );
});

const escenarioFinalizacion = ({
  estado = 'EN_PROCESO',
  fallarDetalle = false,
  novedad = null,
} = {}) => {
  const state = { movimientos: [], detallesMovimiento: [] };
  const recepcion = {
    id: 'recepcion-1',
    numero: 'REC-000001',
    estado,
    bodegaId: 'bodega-1',
    detalles: [
      {
        id: 'detalle-pollo',
        productoId: 'pollo',
        unidadMedidaId: 'kg',
        cantidadRecibida: 98,
        loteProveedor: 'ABC123',
        fechaVencimiento: '2026-09-15',
        producto: producto('pollo', carnica, 'kg'),
      },
      {
        id: 'detalle-insumo',
        productoId: 'caja',
        unidadMedidaId: 'und',
        cantidadRecibida: 25,
        loteProveedor: 'CAJA-1',
        fechaVencimiento: null,
        producto: producto('caja', insumo, 'und'),
      },
    ],
    temperaturas: [
      {
        detalleRecepcionId: 'detalle-pollo',
        productoId: 'pollo',
        temperatura: 3.5,
      },
    ],
    verificacion: {
      certificadoCalidad: true,
      plagas: novedad ? false : true,
      rotuladoCorrecto: true,
      condicionesEmbalaje: true,
      aparienciaColorTextura: true,
      empaqueEmbalaje: true,
      olor: true,
    },
    accionesMejora: novedad
      ? [
          {
            control: 'plagas',
            observacion: 'Se detectó una novedad general',
            decision: novedad,
            estado: novedad ? 'GESTIONADA' : 'PENDIENTE',
          },
        ]
      : [],
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
    TemperaturaRecepcion: {},
    AccionMejoraRecepcion: {},
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
  assert.equal(escenario.recepcion.tieneNovedades, false);
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

test('impide finalizar cuando falta una temperatura obligatoria', async () => {
  const escenario = escenarioFinalizacion();
  escenario.recepcion.temperaturas = [];
  await assert.rejects(
    finalizarRecepcion({
      recepcionId: escenario.recepcion.id,
      usuarioId: 'usuario-1',
      database: escenario.database,
      models: escenario.models,
    }),
    /falta registrar la temperatura/i,
  );
  assert.equal(escenario.state.movimientos.length, 0);
});

test('finaliza con movimiento y novedades cuando la decisión es recibir', async () => {
  const escenario = escenarioFinalizacion({ novedad: 'RECIBIR' });
  const resultado = await finalizarRecepcion({
    recepcionId: escenario.recepcion.id,
    usuarioId: 'usuario-1',
    database: escenario.database,
    models: escenario.models,
  });
  assert.ok(resultado.movimiento);
  assert.equal(escenario.recepcion.estado, 'TERMINADA');
  assert.equal(escenario.recepcion.tieneNovedades, true);
});

test('bloquea la finalización mientras una novedad no tenga decisión', async () => {
  const escenario = escenarioFinalizacion({ novedad: 'RECIBIR' });
  escenario.recepcion.accionesMejora[0].decision = null;
  escenario.recepcion.accionesMejora[0].estado = 'PENDIENTE';
  await assert.rejects(
    finalizarRecepcion({
      recepcionId: escenario.recepcion.id,
      usuarioId: 'usuario-1',
      database: escenario.database,
      models: escenario.models,
    }),
    /gestionar todas las acciones de mejora/i,
  );
  assert.equal(escenario.state.movimientos.length, 0);
  assert.equal(escenario.recepcion.estado, 'EN_PROCESO');
});

test('rechaza sin movimiento cuando una novedad decide no recibir', async () => {
  const escenario = escenarioFinalizacion({ novedad: 'NO_RECIBIR' });
  const resultado = await finalizarRecepcion({
    recepcionId: escenario.recepcion.id,
    usuarioId: 'usuario-1',
    database: escenario.database,
    models: escenario.models,
  });
  assert.equal(resultado.movimiento, null);
  assert.equal(escenario.state.movimientos.length, 0);
  assert.equal(escenario.recepcion.estado, 'RECHAZADA');
  assert.equal(escenario.recepcion.tieneNovedades, true);
});

test('bloquea la finalización por una temperatura fuera de rango pendiente', async () => {
  const escenario = escenarioFinalizacion();
  escenario.recepcion.accionesMejora.push({
    origen: 'TEMPERATURA',
    control: 'temperatura:detalle-pollo',
    observacion: 'Temperatura registrada en 5 °C',
    decision: null,
    estado: 'PENDIENTE',
  });

  await assert.rejects(
    finalizarRecepcion({
      recepcionId: escenario.recepcion.id,
      usuarioId: 'usuario-1',
      database: escenario.database,
      models: escenario.models,
    }),
    /gestionar todas las acciones de mejora/i,
  );
  assert.equal(escenario.state.movimientos.length, 0);
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
  assert.equal(recepcionEsEditable({ estado: 'RECHAZADA' }), false);
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
