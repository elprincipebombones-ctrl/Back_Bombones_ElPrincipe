const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('crypto');
const { PGlite } = require('@electric-sql/pglite');
const { Sequelize } = require('sequelize');
const models = require('../models');
const pedidos = require('../services/ventas/pedidos.service');
const stock = require('../services/ventas/stock-pedidos.service');
const migration = require('../database/migrations/20261006000001-despachos-pedidos-venta');

test('Pedidos: despacho por selección explícita, persistencia histórica, stock y atomicidad', async (t) => {
  const pg = new PGlite();
  const connection = {
    query(sql, params, callback) {
      if (typeof params === 'function') {
        callback = params;
        params = undefined;
      }
      (params ? pg.query(sql, params) : pg.exec(sql)).then((result) => {
        for (const row of Array.isArray(result) ? result : [result]) {
          row.rowCount = row.affectedRows;
          for (const field of row.fields || []) {
            if (field.dataTypeID === 1082) {
              for (const record of row.rows) {
                if (record[field.name] instanceof Date) {
                  record[field.name] = record[field.name].toISOString().slice(0, 10);
                }
              }
            }
          }
        }
        callback(null, result);
      }, callback);
    },
  };
  t.mock.method(models.sequelize.connectionManager, 'getConnection', async () => connection);
  t.mock.method(models.sequelize.connectionManager, 'releaseConnection', async () => {});
  t.mock.method(models.sequelize.connectionManager, '_refreshDynamicOIDs', async () => {});
  t.after(() => pg.close());
  const qi = models.sequelize.getQueryInterface();
  for (const name of [
    'Proveedor',
    'UnidadMedida',
    'Bodega',
    'Producto',
    'MovimientoInventario',
    'DetalleMovimiento',
    'PedidoVenta',
    'PedidoVentaDetalle',
  ]) {
    const model = models[name];
    const attrs = {};
    for (const attr of Object.values(model.rawAttributes)) {
      if (['despachos', 'seleccion_lotes'].includes(attr.field)) continue;
      const definition = { ...attr };
      delete definition.references;
      attrs[attr.field] = definition;
    }
    await qi.createTable(model.tableName, attrs);
  }
  await pg.exec(`
    CREATE SEQUENCE pedidos_venta_numero_seq;
    CREATE SEQUENCE movimientos_sa_numero_seq;
    ALTER TABLE movimientos_inventario ADD UNIQUE (origen, origen_id, tipo_documento);
  `);
  await migration.up(qi, Sequelize);
  await migration.down(qi);
  await migration.up(qi, Sequelize);
  const seleccionMigration = require('../database/migrations/20261006000002-seleccion-lotes-pedidos');
  await seleccionMigration.up(qi, Sequelize);
  await seleccionMigration.down(qi);
  await seleccionMigration.up(qi, Sequelize);
  const usuarioId = randomUUID();
  const cliente = await models.Proveedor.create({
    tipoDocumento: 'NIT',
    numeroDocumento: '123',
    razonSocial: 'Cliente de prueba',
    esCliente: true,
  });
  const unidad = await models.UnidadMedida.create({
    codigo: 'UND',
    nombre: 'Unidad',
    simbolo: 'UND',
  });
  const producto = await models.Producto.create({
    codigo: 'PT1',
    nombre: 'Producto',
    tipoProducto: 'PT',
    categoriaProductoId: randomUUID(),
    unidadMedidaId: unidad.id,
  });
  const bodegaA = await models.Bodega.create({ codigo: 'A', nombre: 'Bodega A', tipo: 'GENERAL' });
  const bodegaB = await models.Bodega.create({ codigo: 'B', nombre: 'Bodega B', tipo: 'GENERAL' });
  const entrada = async (bodega, lote, cantidad, fechaVencimiento) => {
    const movimiento = await models.MovimientoInventario.create({
      tipoDocumento: 'EN',
      numeroDocumento: randomUUID(),
      fecha: new Date(Date.now() - 10000),
      bodegaId: bodega.id,
      origen: 'PRUEBA',
      origenId: randomUUID(),
      usuarioId,
    });
    await models.DetalleMovimiento.create({
      movimientoInventarioId: movimiento.id,
      productoId: producto.id,
      unidadMedidaId: unidad.id,
      cantidad,
      lote,
      fechaVencimiento,
      sentido: 'ENTRADA',
    });
  };
  await entrada(bodegaA, 'TARDIO', 10, '2028-12-31');
  await entrada(bodegaB, 'TEMPRANO', 3.125, '2028-01-31');
  const loteA = (cantidad) => ({
    bodegaId: bodegaA.id,
    lote: 'TARDIO',
    fechaVencimiento: '2028-12-31',
    cantidad,
  });
  const loteB = (cantidad) => ({
    bodegaId: bodegaB.id,
    lote: 'TEMPRANO',
    fechaVencimiento: '2028-01-31',
    cantidad,
  });
  const nuevo = (cantidad, seleccionLotes = [loteA(cantidad)]) =>
    pedidos.crear(
      {
        clienteId: cliente.id,
        detalles: [{ productoId: producto.id, cantidad, seleccionLotes }],
      },
      usuarioId,
    );
  let pedido;

  await t.test('divide entre lotes y bodegas, persiste datos y descuenta stock', async () => {
    pedido = await nuevo(8.125, [loteB(3.125), loteA(5)]);
    const confirmado = await pedidos.confirmar(pedido.id, usuarioId);
    assert.equal(confirmado.estado, 'CONFIRMADO');
    const filas = confirmado.detalles[0].despachos;
    assert.deepEqual(
      filas.map((fila) => [fila.lote, fila.cantidad, fila.bodega, fila.fechaVencimiento]),
      [
        ['TEMPRANO', 3.125, 'Bodega B', '2028-01-31'],
        ['TARDIO', 5, 'Bodega A', '2028-12-31'],
      ],
    );
    assert.equal(await models.MovimientoInventario.count({ where: { origen: 'PEDIDO_VENTA' } }), 2);
    assert.equal((await stock.productosDisponibles())[0].stockDisponible, 5);
    await bodegaA.update({ nombre: 'Nombre nuevo' });
    assert.equal((await pedidos.obtener(pedido.id)).detalles[0].despachos[1].bodega, 'Bodega A');
    assert.equal(
      (await pedidos.listar()).find((p) => p.id === pedido.id).detalles[0].despachos.length,
      2,
    );
  });
  await t.test('no permite confirmar dos veces ni cancelar salidas sin devolución', async () => {
    await assert.rejects(pedidos.confirmar(pedido.id, usuarioId), (e) => e.status === 409);
    await assert.rejects(pedidos.cancelar(pedido.id, 'Prueba', usuarioId), /devolución/);
    assert.equal((await stock.productosDisponibles())[0].stockDisponible, 5);
  });
  await t.test('stock insuficiente deja el pedido en borrador sin salidas', async () => {
    const insuficiente = await nuevo(5);
    await models.PedidoVentaDetalle.update(
      { cantidad: 6, seleccionLotes: [loteA(6)] },
      { where: { pedidoVentaId: insuficiente.id } },
    );
    await assert.rejects(pedidos.confirmar(insuficiente.id, usuarioId), /Stock insuficiente/);
    const guardado = await pedidos.obtener(insuficiente.id);
    assert.equal(guardado.estado, 'BORRADOR');
    assert.equal(guardado.detalles[0].despachos, null);
  });
  await t.test(
    'fallo después de crear la salida revierte stock y detalle histórico',
    async (st) => {
      const fallido = await nuevo(1);
      st.mock.method(models.DetalleMovimiento, 'bulkCreate', async () => {
        throw new Error('Fallo simulado');
      });
      await assert.rejects(pedidos.confirmar(fallido.id, usuarioId), /Fallo simulado/);
      const guardado = await pedidos.obtener(fallido.id);
      assert.equal(guardado.estado, 'BORRADOR');
      assert.equal(guardado.detalles[0].despachos, null);
      assert.equal(
        await models.MovimientoInventario.count({ where: { origen: 'PEDIDO_VENTA' } }),
        2,
      );
      assert.equal((await stock.productosDisponibles())[0].stockDisponible, 5);
    },
  );
  await t.test('pedidos antiguos se consultan sin inventar lotes históricos', async () => {
    const antiguo = await nuevo(1);
    await models.PedidoVenta.update({ estado: 'CONFIRMADO' }, { where: { id: antiguo.id } });
    assert.equal((await pedidos.obtener(antiguo.id)).detalles[0].despachos, null);
    await pedidos.cancelar(antiguo.id, 'Cancelación sin despacho', usuarioId);
    assert.equal((await stock.productosDisponibles())[0].stockDisponible, 5);
  });
  await t.test(
    'rechaza lote ajeno, vencimiento distinto, duplicados y totales manipulados',
    async () => {
      await assert.rejects(nuevo(1, [{ ...loteA(1), lote: 'INEXISTENTE' }]), /Stock insuficiente/);
      await assert.rejects(nuevo(1, [{ ...loteA(1), bodegaId: bodegaB.id }]), /Stock insuficiente/);
      await assert.rejects(
        nuevo(1, [{ ...loteA(1), fechaVencimiento: '2028-12-30' }]),
        /Stock insuficiente/,
      );
      await assert.rejects(nuevo(2, [loteA(1), loteA(1)]), /No repita/);
      await assert.rejects(nuevo(2, [loteA(1)]), /suma/);
      await assert.rejects(nuevo(1, []), /Seleccione los lotes/);
      await assert.rejects(nuevo(1, [loteA(-1)]), /no es válida/);
    },
  );
  await t.test('borrador conserva selección y exige corregir borradores antiguos', async () => {
    const borrador = await nuevo(1);
    assert.equal((await pedidos.obtener(borrador.id)).detalles[0].seleccionLotes[0].lote, 'TARDIO');
    await models.PedidoVentaDetalle.update(
      { seleccionLotes: null },
      { where: { pedidoVentaId: borrador.id } },
    );
    await assert.rejects(pedidos.confirmar(borrador.id, usuarioId), /Seleccione los lotes/);
    await pedidos.actualizar(borrador.id, {
      detalles: [{ productoId: producto.id, cantidad: 2, seleccionLotes: [loteA(2)] }],
    });
    assert.equal((await pedidos.obtener(borrador.id)).detalles[0].seleccionLotes[0].cantidad, 2);
  });
  await t.test('no sustituye un lote agotado aunque haya saldo en otros lotes', async () => {
    const borrador = await nuevo(1);
    await models.PedidoVentaDetalle.update(
      { seleccionLotes: [loteB(1)] },
      { where: { pedidoVentaId: borrador.id } },
    );
    await assert.rejects(pedidos.confirmar(borrador.id, usuarioId), /Stock insuficiente/);
    assert.equal((await pedidos.obtener(borrador.id)).estado, 'BORRADOR');
    assert.equal((await stock.productosDisponibles())[0].stockDisponible, 5);
  });
  await t.test('saldo incluye salidas posteriores al inicio de la transacción', async () => {
    await models.sequelize.transaction(async (transaction) => {
      // Reproduce el corte temporal de una transacción que esperó un bloqueo.
      await new Promise((resolve) => setTimeout(resolve, 30));
      const salida = await models.MovimientoInventario.create(
        {
          tipoDocumento: 'SA',
          numeroDocumento: randomUUID(),
          fecha: new Date(),
          bodegaId: bodegaA.id,
          origen: 'PRUEBA',
          origenId: randomUUID(),
          usuarioId,
        },
        { transaction },
      );
      await models.DetalleMovimiento.create(
        {
          movimientoInventarioId: salida.id,
          productoId: producto.id,
          unidadMedidaId: unidad.id,
          cantidad: 1,
          lote: 'TARDIO',
          fechaVencimiento: '2028-12-31',
          sentido: 'SALIDA',
        },
        { transaction },
      );
      assert.equal(
        (await stock.productosDisponibles([producto.id], transaction))[0].stockDisponible,
        4,
      );
    });
  });
  await t.test(
    'respeta selección no FEFO y distingue el mismo lote por bodega y vencimiento',
    async () => {
      await entrada(bodegaA, 'COMPARTIDO', 2, '2029-01-31');
      await entrada(bodegaB, 'COMPARTIDO', 3, '2029-01-31');
      await entrada(bodegaA, 'COMPARTIDO', 4, '2030-01-31');
      const seleccion = [
        { bodegaId: bodegaA.id, lote: 'COMPARTIDO', fechaVencimiento: '2029-01-31', cantidad: 2 },
      ];
      const primero = await nuevo(2, seleccion);
      const segundo = await nuevo(2, seleccion);
      const confirmado = await pedidos.confirmar(primero.id, usuarioId);
      assert.equal(confirmado.detalles[0].despachos.length, 1);
      assert.equal(confirmado.detalles[0].despachos[0].lote, 'COMPARTIDO');
      assert.equal(confirmado.detalles[0].despachos[0].bodegaId, bodegaA.id);
      assert.equal(confirmado.detalles[0].despachos[0].fechaVencimiento, '2029-01-31');
      await assert.rejects(pedidos.confirmar(segundo.id, usuarioId), /Stock insuficiente/);
      const lotes = (await stock.productosDisponibles())[0].lotes;
      assert.equal(lotes.find((lote) => lote.lote === 'TARDIO').disponible, 4);
      assert.equal(
        lotes.find((lote) => lote.lote === 'COMPARTIDO' && lote.bodegaId === bodegaB.id).disponible,
        3,
      );
      assert.equal(lotes.find((lote) => lote.fechaVencimiento === '2030-01-31').disponible, 4);
      assert.equal((await pedidos.obtener(segundo.id)).estado, 'BORRADOR');
    },
  );
});
