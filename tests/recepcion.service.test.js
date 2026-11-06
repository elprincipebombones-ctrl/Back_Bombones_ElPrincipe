const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calcularCostoTotal,
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
  condicionTermica: reglas.requiereTemperatura
    ? {
        codigo: 'REFRIGERADO',
        nombre: 'Refrigerado',
        temperaturaMinima: 0,
        temperaturaMaxima: 4,
      }
    : null,
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

test('el SQL de finalizacion bloquea solo Recepcion con relaciones opcionales', async (t) => {
  const sequelize = require('../database/database');
  const models = require('../models');
  let sqlGenerado;
  t.mock.method(sequelize, 'query', async (sql) => {
    sqlGenerado = sql;
    return null;
  });

  await assert.rejects(
    finalizarRecepcion({
      recepcionId: '21994f71-37ee-4844-b9ae-302c32fdfc05',
      usuarioId: 'usuario-1',
      database: {
        transaction: async (callback) => callback({ LOCK: { UPDATE: 'UPDATE' } }),
      },
      models,
    }),
    (error) => error.status === 404,
  );
  assert.match(sqlGenerado, /LEFT OUTER JOIN/);
  assert.match(sqlGenerado, /FOR UPDATE OF "Recepcion";$/);
});

const modelosValidacion = (productos) => ({
  Producto: {
    findAll: async () => productos,
  },
  Bodega: { findAll: async () => [{ id: 'bodega-1', estado: true }] },
  CategoriaProducto: {},
});

test('MP cárnica exige lote y vencimiento y toma la unidad del producto', async () => {
  const pollo = producto('pollo', carnica, 'kg');
  const base = {
    bodegaId: 'bodega-1',
    productoId: pollo.id,
    cantidadRecibida: 98,
    costoUnitario: 12500.25,
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
      [
        {
          bodegaId: 'bodega-1',
          productoId: productoNoCarnico.id,
          cantidadRecibida: 20,
          costoUnitario: 1000,
        },
      ],
      null,
      modelosValidacion([productoNoCarnico]),
    ),
    /lote/i,
  );
  await assert.rejects(
    validarDetalles(
      [
        {
          bodegaId: 'bodega-1',
          productoId: productoNoCarnico.id,
          cantidadRecibida: 20,
          costoUnitario: 1000,
          loteProveedor: 'L-1',
        },
      ],
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
        bodegaId: 'bodega-1',
        productoId: productoInsumo.id,
        cantidadSolicitada: 20,
        cantidadRecibida: 20,
        costoUnitario: 1000,
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
      [
        {
          bodegaId: 'bodega-1',
          productoId: material.id,
          cantidadRecibida: 10,
          costoUnitario: 1000,
          loteProveedor: 'EMP-1',
        },
      ],
      null,
      modelosValidacion([material]),
    ),
    /fecha de vencimiento/i,
  );
});

test('exige costo unitario positivo en cada producto', async () => {
  const productoInsumo = producto('insumo-costo', insumo);
  const base = {
    bodegaId: 'bodega-1',
    productoId: productoInsumo.id,
    cantidadRecibida: 5,
    loteProveedor: 'INS-COSTO',
  };

  await assert.rejects(
    validarDetalles([base], null, modelosValidacion([productoInsumo])),
    /costo unitario/i,
  );
  await assert.rejects(
    validarDetalles([{ ...base, costoUnitario: 0 }], null, modelosValidacion([productoInsumo])),
    /costo unitario/i,
  );
});

test('calcula el costo total con la precisión del movimiento', () => {
  assert.equal(calcularCostoTotal(98, 12500.25), '1225024.50');
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
        bodegaId: 'bodega-1',
        productoId: 'pollo',
        unidadMedidaId: 'kg',
        cantidadRecibida: 98,
        costoUnitario: 12500.25,
        loteProveedor: 'ABC123',
        fechaVencimiento: '2026-09-15',
        producto: producto('pollo', carnica, 'kg'),
      },
      {
        id: 'detalle-insumo',
        bodegaId: 'bodega-1',
        productoId: 'caja',
        unidadMedidaId: 'und',
        cantidadRecibida: 25,
        costoUnitario: 800,
        loteProveedor: 'CAJA-1',
        fechaVencimiento: null,
        producto: producto('caja', insumo, 'und'),
      },
    ],
    temperaturas: [
      {
        detalleRecepcionId: 'detalle-pollo',
        bodegaId: 'bodega-1',
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
    Bodega: { findAll: async () => [{ id: 'bodega-1', estado: true }] },
    CategoriaProducto: {},
    CondicionTermica: {},
    TemperaturaRecepcion: {},
    AccionMejoraRecepcion: {},
    VerificacionRecepcion: {},
    MovimientoInventario: {
      findOne: async () => state.movimientos[0] || null,
      create: async (datos) => {
        const movimiento = { id: `movimiento-${state.movimientos.length + 1}`, ...datos };
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
  assert.equal(escenario.state.detallesMovimiento[0].costoUnitario, 12500.25);
  assert.equal(escenario.state.detallesMovimiento[0].costoTotal, '1225024.50');
  assert.equal(escenario.recepcion.estado, 'TERMINADA');
  assert.equal(escenario.recepcion.tieneNovedades, false);
});

test('agrupa productos por bodega y genera una entrada por destino', async () => {
  const escenario = escenarioFinalizacion();
  escenario.recepcion.bodegaId = null;
  escenario.recepcion.detalles[1].bodegaId = 'bodega-2';
  escenario.recepcion.detalles.push({
    ...escenario.recepcion.detalles[1],
    id: 'detalle-extra',
    cantidadRecibida: 10,
  });
  escenario.models.Bodega.findAll = async () => [{ id: 'bodega-1' }, { id: 'bodega-2' }];
  const resultado = await finalizarRecepcion({
    recepcionId: 'recepcion-1',
    usuarioId: 'usuario-1',
    ...escenario,
  });
  assert.equal(resultado.movimientos.length, 2);
  assert.equal(resultado.movimiento, null);
  assert.deepEqual(
    resultado.movimientos.map((m) => m.bodegaId),
    ['bodega-1', 'bodega-2'],
  );
  assert.equal(
    escenario.state.detallesMovimiento.filter((d) => d.movimientoInventarioId === 'movimiento-1')
      .length,
    1,
  );
  assert.equal(
    escenario.state.detallesMovimiento.filter((d) => d.movimientoInventarioId === 'movimiento-2')
      .length,
    2,
  );
});

test('no finaliza si un producto no tiene bodega o su destino está inactivo', async () => {
  const escenario = escenarioFinalizacion();
  escenario.recepcion.detalles[0].bodegaId = null;
  await assert.rejects(
    finalizarRecepcion({ recepcionId: 'recepcion-1', usuarioId: 'usuario-1', ...escenario }),
    /Cada producto/,
  );
  escenario.recepcion.detalles[0].bodegaId = 'bodega-inactiva';
  await assert.rejects(
    finalizarRecepcion({ recepcionId: 'recepcion-1', usuarioId: 'usuario-1', ...escenario }),
    /inactiva/,
  );
  assert.equal(escenario.state.movimientos.length, 0);
  assert.equal(escenario.recepcion.estado, 'EN_PROCESO');
});

test('revierte todas las bodegas si falla la segunda entrada', async () => {
  const escenario = escenarioFinalizacion();
  escenario.recepcion.detalles[1].bodegaId = 'bodega-2';
  escenario.models.Bodega.findAll = async () => [{ id: 'bodega-1' }, { id: 'bodega-2' }];
  const guardar = escenario.models.DetalleMovimiento.bulkCreate;
  escenario.models.DetalleMovimiento.bulkCreate = async (datos) => {
    if (escenario.state.movimientos.length === 2) throw new Error('Fallo segunda bodega');
    return guardar(datos);
  };
  await assert.rejects(
    finalizarRecepcion({ recepcionId: 'recepcion-1', usuarioId: 'usuario-1', ...escenario }),
    /segunda bodega/,
  );
  assert.equal(escenario.state.movimientos.length, 0);
  assert.equal(escenario.state.detallesMovimiento.length, 0);
  assert.equal(escenario.recepcion.estado, 'EN_PROCESO');
});

test('validar detalles exige una bodega activa por producto', async () => {
  const productoEmpaque = producto('bolsa', {
    requiereLote: false,
    requiereFechaVencimiento: false,
  });
  await assert.rejects(
    validarDetalles(
      [{ productoId: 'bolsa', cantidadRecibida: 5, costoUnitario: 100 }],
      null,
      modelosValidacion([productoEmpaque]),
    ),
    /bodega/,
  );
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

test('genera movimiento parcial cuando se rechaza únicamente un producto', async () => {
  const escenario = escenarioFinalizacion();
  escenario.recepcion.accionesMejora.push({
    origen: 'TEMPERATURA',
    afectacion: 'PRODUCTO',
    detalleRecepcionId: 'detalle-pollo',
    control: 'temperatura:detalle-pollo',
    observacion: 'Temperatura fuera del rango',
    decision: 'NO_RECIBIR',
    estado: 'GESTIONADA',
  });

  const resultado = await finalizarRecepcion({
    recepcionId: escenario.recepcion.id,
    usuarioId: 'usuario-1',
    database: escenario.database,
    models: escenario.models,
  });

  assert.ok(resultado.movimiento);
  assert.equal(resultado.recepcionParcial, true);
  assert.equal(escenario.recepcion.estado, 'TERMINADA');
  assert.equal(escenario.recepcion.tieneNovedades, true);
  assert.equal(escenario.state.detallesMovimiento.length, 1);
  assert.equal(escenario.state.detallesMovimiento[0].productoId, 'caja');
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
