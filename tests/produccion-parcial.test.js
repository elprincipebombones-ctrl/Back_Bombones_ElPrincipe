const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('crypto');
const { PGlite } = require('@electric-sql/pglite');
const models = require('../models');
const {
  iniciarProduccion,
  registrarParcial,
  saldosPep,
} = require('../services/produccion/produccion-parcial.service');
const {
  confirmarSalidaMp,
  obtenerSaldosLotes,
} = require('../services/produccion/orden-produccion.service');
const control = require('../services/produccion/control-produccion.service');
const migration = require('../database/migrations/20260930000001-produccion-pep-parciales');
const solicitudes = require('../services/produccion/solicitudes-mp.service');
const migrationSolicitudes = require('../database/migrations/20260930000002-solicitudes-movimiento-ot');

test('PEP: liberación, inicio, parciales FEFO, aislamiento, rollback y trazabilidad', async (t) => {
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
                if (record[field.name] instanceof Date)
                  record[field.name] = record[field.name].toISOString().slice(0, 10);
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
  const names = [
    'MotivoMerma',
    'FormatoCalidad',
    'TipoInspeccion',
    'VersionFormato',
    'Usuario',
    'UnidadMedida',
    'Bodega',
    'Producto',
    'MovimientoInventario',
    'DetalleMovimiento',
    'OrdenProduccion',
    'OrdenProduccionDetalle',
    'ResultadoProduccion',
    'FormulaProducto',
    'FormulaComponente',
    'ConversionUnidad',
    'MermaProduccion',
    'OrdenProduccionSimulacion',
    'OrdenProduccionSimulacionDetalle',
    'OrdenProduccionSimulacionLote',
  ];
  for (const name of names) {
    const model = models[name];
    const attrs = {};
    for (const attr of Object.values(model.rawAttributes)) {
      if (
        name === 'OrdenProduccion' &&
        ['movimiento_pep_id', 'usuario_inicio_id', 'fecha_inicio'].includes(attr.field)
      )
        continue;
      const definition = { ...attr };
      delete definition.references;
      attrs[attr.field] = definition;
    }
    await qi.createTable(model.tableName, attrs);
  }
  await pg.exec(`CREATE SEQUENCE movimientos_en_numero_seq; CREATE SEQUENCE movimientos_sa_numero_seq;
    ALTER TABLE movimientos_inventario ADD UNIQUE (origen, origen_id, tipo_documento);
    ALTER TABLE resultados_produccion ADD UNIQUE (orden_produccion_id, producto_terminado_id);`);
  await migration.up(qi);
  // El rollback de la migración vacía conserva la bodega y permite reinstalar sin duplicarla.
  await migration.down(qi);
  await migration.up(qi);
  await migrationSolicitudes.up(qi);
  await migrationSolicitudes.down(qi);
  await migrationSolicitudes.up(qi);
  assert.equal(await models.Bodega.count({ where: { codigo: 'PEP' } }), 1);
  const usuarioId = randomUUID();
  // Usuario mínimo para las FK nuevas, sin depender de autenticación en esta prueba de servicio.
  await pg.exec(`ALTER TABLE usuarios ALTER COLUMN nombre DROP NOT NULL`);
  const usuarioAttrs = Object.values(models.Usuario.rawAttributes).filter(
    (a) => !a.primaryKey && a.allowNull === false,
  );
  for (const attr of usuarioAttrs)
    await pg.exec(`ALTER TABLE usuarios ALTER COLUMN "${attr.field}" DROP NOT NULL`);
  await pg.query('INSERT INTO usuarios(id) VALUES ($1)', [usuarioId]);
  const unidad = await models.UnidadMedida.create({
    codigo: 'KG',
    nombre: 'Kilogramo',
    simbolo: 'KG',
  });
  const gramos = await models.UnidadMedida.create({ codigo: 'G', nombre: 'Gramo', simbolo: 'G' });
  await models.ConversionUnidad.create({
    unidadOrigenId: gramos.id,
    unidadDestinoId: unidad.id,
    factor: 0.001,
  });
  const crearProducto = (codigo, tipoProducto) =>
    models.Producto.create({
      codigo,
      nombre: codigo,
      tipoProducto,
      categoriaProductoId: randomUUID(),
      unidadMedidaId: unidad.id,
    });
  const mp = await crearProducto('POLLO', 'MP');
  const pt = await crearProducto('SUPER', 'PT');
  const mini = await crearProducto('MINI', 'PT');
  const origen = await models.Bodega.create({ codigo: 'MP', nombre: 'MP', tipo: 'GENERAL' });
  const destino = await models.Bodega.create({
    codigo: 'PT',
    nombre: 'PT',
    tipo: 'GENERAL',
    esBodegaPtDefault: true,
  });
  const pep = await models.Bodega.findOne({ where: { codigo: 'PEP' } });
  for (const producto of [pt, mini]) {
    const formula = await models.FormulaProducto.create({ productoTerminadoId: producto.id });
    await models.FormulaComponente.create({
      formulaProductoId: formula.id,
      productoId: mp.id,
      cantidad: 350,
      unidadMedidaId: gramos.id,
      orden: 1,
    });
  }
  const crearOrden = async (numero, lotes) => {
    const orden = await models.OrdenProduccion.create({
      numero,
      fecha: '2026-09-30',
      usuarioId,
      estado: 'SIMULADA',
    });
    await models.OrdenProduccionDetalle.bulkCreate(
      [pt, mini].map((producto) => ({
        ordenProduccionId: orden.id,
        productoTerminadoId: producto.id,
        cantidad: 10,
      })),
    );
    const sim = await models.OrdenProduccionSimulacion.create({
      ordenProduccionId: orden.id,
      fechaSimulacion: new Date(),
    });
    const total = lotes.reduce((sum, lote) => sum + lote.cantidad, 0);
    const detalle = await models.OrdenProduccionSimulacionDetalle.create({
      simulacionId: sim.id,
      productoId: mp.id,
      cantidadRequerida: total,
      cantidadDisponible: total,
      cantidadFaltante: 0,
      unidadMedidaId: unidad.id,
      estado: 'OK',
    });
    await models.OrdenProduccionSimulacionLote.bulkCreate(
      lotes.map((lote) => ({
        ...lote,
        detalleSimulacionId: detalle.id,
        productoId: mp.id,
        bodegaId: origen.id,
        saldoDisponible: lote.cantidad,
      })),
    );
    return orden;
  };
  const lotes = [
    { lote: 'TEMPRANO', fechaVencimiento: '2027-01-01', cantidad: 4 },
    { lote: 'TARDIO', fechaVencimiento: '2027-06-01', cantidad: 10 },
  ];
  const inicial = await models.MovimientoInventario.create({
    tipoDocumento: 'EN',
    numeroDocumento: 'STOCK',
    fecha: new Date(),
    bodegaId: origen.id,
    origen: 'TEST',
    origenId: randomUUID(),
    usuarioId,
  });
  await models.DetalleMovimiento.bulkCreate(
    lotes.map((lote) => ({
      ...lote,
      cantidad: lote.cantidad * 2,
      productoId: mp.id,
      unidadMedidaId: unidad.id,
      movimientoInventarioId: inicial.id,
    })),
  );
  const orden = await crearOrden('OP-1', lotes);
  const liberar = (ot) =>
    models.sequelize.transaction(async (transaction) =>
      confirmarSalidaMp(
        await models.OrdenProduccion.findByPk(ot.id, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        }),
        usuarioId,
        transaction,
      ),
    );
  await liberar(orden);
  await orden.reload();
  assert.equal(orden.estado, 'LISTA_PRODUCCION');
  assert.ok(orden.movimientoPepId);
  assert.equal(
    (await obtenerSaldosLotes([mp.id])).some((l) => l.bodegaId === pep.id),
    false,
  );
  const salida = await models.DetalleMovimiento.findAll({
    where: { movimientoInventarioId: orden.movimientoSalidaId },
  });
  const entrada = await models.DetalleMovimiento.findAll({
    where: { movimientoInventarioId: orden.movimientoPepId },
  });
  const datos = (rows) =>
    rows
      .map((r) => [r.productoId, r.lote, r.fechaVencimiento, r.cantidad, r.unidadMedidaId])
      .sort();
  assert.deepEqual(datos(salida), datos(entrada));
  const iniciar = (resultados) =>
    models.sequelize.transaction((transaction) =>
      iniciarProduccion({ ordenId: orden.id, resultados, usuarioId, transaction }),
    );
  await assert.rejects(iniciar([{ productoTerminadoId: pt.id, fechaVencimiento: '2027-10-01' }]));
  assert.equal(await models.ResultadoProduccion.count(), 0);
  await iniciar(
    [pt, mini].map((p) => ({ productoTerminadoId: p.id, fechaVencimiento: '2027-10-01' })),
  );
  await orden.reload();
  assert.equal(orden.estado, 'EN_PRODUCCION');
  assert.equal(orden.usuarioInicioId, usuarioId);
  const resultados = await models.ResultadoProduccion.findAll();
  assert.equal(new Set(resultados.map((r) => r.lotePt)).size, 2);
  const parcial = (cantidad, productoTerminadoId = pt.id) =>
    models.sequelize.transaction((transaction) =>
      registrarParcial({
        ordenId: orden.id,
        productoTerminadoId,
        cantidad,
        usuarioId,
        transaction,
      }),
    );
  const reporte = await parcial(15); // Supera el planeado de 10.
  const consumo = await models.DetalleMovimiento.findAll({
    where: { movimientoInventarioId: reporte.movimientoSalidaId },
    order: [['fechaVencimiento', 'ASC']],
  });
  assert.deepEqual(
    consumo.map((d) => [d.lote, Number(d.cantidad)]),
    [
      ['TEMPRANO', 4],
      ['TARDIO', 1.25],
    ],
  );
  assert.equal(
    (await models.MovimientoInventario.findByPk(reporte.movimientoEntradaId)).bodegaId,
    destino.id,
  );
  const segundo = await parcial(5);
  assert.equal(segundo.lote, reporte.lote);
  assert.equal(
    Number(
      (await models.ResultadoProduccion.findOne({ where: { productoTerminadoId: pt.id } }))
        .cantidadProducida,
    ),
    20,
  );
  const otra = await crearOrden('OP-2', lotes);
  await pg.exec(`CREATE FUNCTION fallar_pep() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW.origen='OT_PEP' THEN RAISE EXCEPTION 'fallo PEP'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER fallo_pep BEFORE INSERT ON movimientos_inventario FOR EACH ROW EXECUTE FUNCTION fallar_pep();`);
  const antesLiberar = await models.MovimientoInventario.count();
  await assert.rejects(liberar(otra));
  assert.equal(await models.MovimientoInventario.count(), antesLiberar);
  await otra.reload();
  assert.equal(otra.estado, 'SIMULADA');
  assert.equal(otra.movimientoSalidaId, null);
  await pg.exec('DROP TRIGGER fallo_pep ON movimientos_inventario');
  await liberar(otra);
  await assert.rejects(parcial(0), /mayor que cero/);
  await assert.rejects(parcial(1, randomUUID()), /no tiene lote/);
  assert.equal(await models.ReporteProduccion.count(), 2);
  await pg.exec(`CREATE FUNCTION fallar_entrada_pt() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW.origen='PRODUCCION_PARCIAL' AND NEW.tipo_documento='EN' THEN RAISE EXCEPTION 'fallo EN'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER fallo_pt BEFORE INSERT ON movimientos_inventario FOR EACH ROW EXECUTE FUNCTION fallar_entrada_pt();`);
  const antes = await models.MovimientoInventario.count();
  await assert.rejects(parcial(1));
  assert.equal(await models.MovimientoInventario.count(), antes);
  assert.equal(await models.ReporteProduccion.count(), 2);
  await pg.exec('DROP TRIGGER fallo_pt ON movimientos_inventario');
  const familiaId = randomUUID();
  await mp.update({ familiaMpCarnicaId: familiaId });
  const formulaMini = await models.FormulaProducto.findOne({
    where: { productoTerminadoId: mini.id },
  });
  await models.FormulaComponente.update(
    { productoId: null, familiaMpCarnicaId: familiaId },
    { where: { formulaProductoId: formulaMini.id } },
  );
  await parcial(2, mini.id);
  await assert.rejects(
    models.ReporteProduccion.destroy({ where: { id: reporte.id } }),
    /modificar o eliminar/,
  );
  assert.equal(
    (await saldosPep(orden)).reduce((s, l) => s + Number(l.saldo), 0),
    6.3,
  );
  const detalle = await control.obtenerDetalleControl(orden.id);
  assert.equal(detalle.parciales.length, 3);
  assert.equal(detalle.consumosMp[0].consumoTeorico, 7.7);
  assert.equal(detalle.consumosMp[0].saldoEstimadoPep, 6.3);
  assert.equal(
    detalle.resultados.find((r) => r.productoTerminadoId === pt.id).desviacionPorcentaje,
    100,
  );
  await assert.rejects(
    models.sequelize.transaction((transaction) =>
      control.guardarResultados(
        orden.id,
        [{ productoTerminadoId: pt.id, cantidadProducida: 1 }],
        transaction,
      ),
    ),
    /parcial/,
  );
  const motivo = await models.MotivoMerma.create({ codigo: 'PRUEBA', nombre: 'Prueba' });
  const merma = (tipoMerma, productoId, cantidad) =>
    models.sequelize.transaction((transaction) =>
      control.validarYGuardarMerma({
        ordenId: orden.id,
        usuarioId,
        transaction,
        datos: { tipoMerma, productoId, cantidad, motivoMermaId: motivo.id },
      }),
    );
  await merma('PT', pt.id, 50);
  await merma('MP', mp.id, 1);
  const limitado = await parcial(16);
  const advertencia = limitado.getDataValue('advertenciasPep')[0];
  assert.equal(advertencia.requerido, 5.6);
  assert.equal(advertencia.disponible, 5.3);
  assert.equal(advertencia.consumido, 5.3);
  assert.equal(advertencia.faltante, 0.3);
  assert.equal(
    Number(
      await models.DetalleMovimiento.sum('cantidad', {
        where: { movimientoInventarioId: limitado.movimientoSalidaId },
      }),
    ),
    5.3,
  );
  const agotado = await parcial(30);
  assert.equal(agotado.movimientoSalidaId, null);
  assert.ok(agotado.movimientoEntradaId);
  assert.equal(agotado.getDataValue('advertenciasPep')[0].consumido, 0);
  assert.equal(agotado.getDataValue('advertenciasPep')[0].faltante, 10.5);
  assert.equal(agotado.lote, reporte.lote);
  const detalleAgotado = await control.obtenerDetalleControl(orden.id);
  assert.equal(detalleAgotado.consumosMp[0].saldoEstimadoPep, 0);
  assert.equal(
    detalleAgotado.resultados.find((r) => r.productoTerminadoId === pt.id).cantidadProducida,
    66,
  );
  await otra.reload();
  assert.equal(
    (await saldosPep(otra)).reduce((total, lote) => total + Number(lote.saldo), 0),
    14,
  );
  assert.ok((await saldosPep(orden)).every((lote) => Number(lote.saldo) >= 0));
  // Una familia sin lotes en esta OT tampoco bloquea el parcial.
  await models.FormulaComponente.update(
    { familiaMpCarnicaId: randomUUID() },
    {
      where: { formulaProductoId: formulaMini.id },
    },
  );
  const sinLotes = await parcial(1, mini.id);
  assert.equal(sinLotes.movimientoSalidaId, null);
  assert.equal(sinLotes.getDataValue('advertenciasPep')[0].disponible, 0);

  // Solicitudes: creación sin inventario, revalidación, trazabilidad e integración PEP.
  const stockExtra = await models.MovimientoInventario.create({
    tipoDocumento: 'EN',
    numeroDocumento: 'STOCK-ADICIONAL',
    fecha: new Date(),
    bodegaId: origen.id,
    origen: 'TEST',
    origenId: randomUUID(),
    usuarioId,
  });
  await models.DetalleMovimiento.create({
    movimientoInventarioId: stockExtra.id,
    productoId: mp.id,
    unidadMedidaId: unidad.id,
    cantidad: 8,
    lote: 'NUEVO',
    fechaVencimiento: '2027-09-01',
  });
  const opciones = await solicitudes.catalogos(orden.id, 'ADICIONAL');
  const opcion = opciones.lotes.find((l) => l.lote === 'NUEVO');
  assert.ok(opcion);
  const datosSolicitud = { ...opcion, tipo: 'ADICIONAL', cantidad: 6, motivo: 'Reposición manual' };
  const solicitar = (datos) =>
    models.sequelize.transaction((transaction) =>
      solicitudes.crear(orden.id, datos, usuarioId, transaction),
    );
  const resolver = (id, accion = 'EJECUTAR', nota = null) =>
    models.sequelize.transaction((transaction) =>
      solicitudes.resolver(id, accion, nota, usuarioId, transaction),
    );
  const inventarioAntes = await models.MovimientoInventario.count();
  await assert.rejects(solicitar({ ...datosSolicitud, motivo: '  ' }), /motivo/);
  await assert.rejects(solicitar({ ...datosSolicitud, productoId: pt.id }), /no son válidos/);
  await assert.rejects(solicitar({ ...datosSolicitud, bodegaDestinoId: destino.id }), /bodegas/);
  await assert.rejects(
    solicitar({ ...datosSolicitud, fechaVencimiento: '2028-01-01' }),
    /no son válidos/,
  );
  const rechazada = await solicitar(datosSolicitud);
  await assert.rejects(resolver(rechazada.id, 'RECHAZAR', ''), /obligatoria/);
  await resolver(rechazada.id, 'RECHAZAR', 'No se requiere');
  assert.equal((await solicitudes.obtener(rechazada.id)).estado, 'RECHAZADA');
  assert.equal(await models.MovimientoInventario.count(), inventarioAntes);
  const adicional = await solicitar(datosSolicitud);
  const sinReserva = await solicitar(datosSolicitud);
  assert.equal(await models.MovimientoInventario.count(), inventarioAntes);
  assert.equal((await solicitudes.listar({ estado: 'PENDIENTE' })).pendientes, 2);
  await resolver(adicional.id);
  const atendida = await solicitudes.obtener(adicional.id);
  assert.equal(atendida.estado, 'ATENDIDA');
  assert.ok(atendida.movimientoSalidaId && atendida.movimientoEntradaId);
  assert.equal(atendida.usuarioApruebaId, usuarioId);
  const salidaAdicional = await models.DetalleMovimiento.findAll({
    where: { movimientoInventarioId: atendida.movimientoSalidaId },
  });
  const entradaAdicional = await models.DetalleMovimiento.findAll({
    where: { movimientoInventarioId: atendida.movimientoEntradaId },
  });
  assert.deepEqual(datos(salidaAdicional), datos(entradaAdicional));
  assert.equal(salidaAdicional[0].fechaVencimiento, '2027-09-01');
  await assert.rejects(resolver(adicional.id), /ya fue resuelta/);
  await assert.rejects(resolver(sinReserva.id), /saldo disponible ya no alcanza/);
  assert.equal((await solicitudes.obtener(sinReserva.id)).estado, 'PENDIENTE');
  await assert.rejects(
    models.SolicitudMovimientoOt.destroy({ where: { id: adicional.id } }),
    /resuelta/,
  );
  const nuevoParcial = await parcial(10);
  assert.equal(nuevoParcial.getDataValue('advertenciasPep').length, 0);
  const opcionesDevolucion = await solicitudes.catalogos(orden.id, 'DEVOLUCION');
  const loteDevolver = opcionesDevolucion.lotes.find((l) => l.lote === 'NUEVO');
  assert.equal(loteDevolver.disponible, 2.5);
  assert.equal(loteDevolver.bodegaDestinoId, origen.id);
  const datosDevolucion = {
    ...loteDevolver,
    tipo: 'DEVOLUCION',
    cantidad: 2,
    motivo: 'Sobrante de lote',
  };
  await assert.rejects(
    solicitar({ ...datosDevolucion, bodegaDestinoId: destino.id }),
    /no son válidos/,
  );
  await assert.rejects(solicitar({ ...datosDevolucion, cantidad: 3 }), /saldo disponible/);
  const devolucion = await solicitar(datosDevolucion);
  const devolucionPendiente = await solicitar(datosDevolucion);
  // Un fallo al crear la entrada debe revertir la salida y dejar la solicitud pendiente.
  await pg.exec(`CREATE FUNCTION fallar_devolucion() RETURNS trigger LANGUAGE plpgsql AS $fn$
    BEGIN IF NEW.origen='OT_MP_DEVOLUCION' AND NEW.tipo_documento='EN' THEN RAISE EXCEPTION 'fallo devolución'; END IF; RETURN NEW; END $fn$;
    CREATE TRIGGER fallo_devolucion BEFORE INSERT ON movimientos_inventario FOR EACH ROW EXECUTE FUNCTION fallar_devolucion();`);
  const antesDevolver = await models.MovimientoInventario.count();
  await assert.rejects(resolver(devolucion.id), /fallo devolución/);
  assert.equal(await models.MovimientoInventario.count(), antesDevolver);
  assert.equal((await solicitudes.obtener(devolucion.id)).estado, 'PENDIENTE');
  await pg.exec('DROP TRIGGER fallo_devolucion ON movimientos_inventario');
  await resolver(devolucion.id);
  await assert.rejects(resolver(devolucionPendiente.id), /saldo disponible/);
  const detalleSolicitudes = await control.obtenerDetalleControl(orden.id);
  assert.equal(detalleSolicitudes.consumosMp[0].adicionalMp, 6);
  assert.equal(detalleSolicitudes.consumosMp[0].devueltoMp, 2);
  assert.equal(detalleSolicitudes.consumosMp[0].saldoEstimadoPep, 0.5);
  assert.equal(
    (await saldosPep(otra)).reduce((total, lote) => total + Number(lote.saldo), 0),
    14,
  );
  const segundaBodega = await models.Bodega.create({
    codigo: 'MP2',
    nombre: 'MP secundaria',
    tipo: 'GENERAL',
  });
  const otraEntrada = await models.MovimientoInventario.create({
    tipoDocumento: 'EN',
    numeroDocumento: 'STOCK-OTRA-BODEGA',
    fecha: new Date(),
    bodegaId: segundaBodega.id,
    origen: 'TEST',
    origenId: randomUUID(),
    usuarioId,
  });
  await models.DetalleMovimiento.create({
    movimientoInventarioId: otraEntrada.id,
    productoId: mp.id,
    unidadMedidaId: unidad.id,
    cantidad: 4,
    lote: 'NUEVO',
    fechaVencimiento: '2027-09-01',
  });
  const opcionSegunda = (await solicitudes.catalogos(orden.id, 'ADICIONAL')).lotes.find(
    (l) => l.bodegaOrigenId === segundaBodega.id,
  );
  const adicionalSegunda = await solicitar({
    ...opcionSegunda,
    tipo: 'ADICIONAL',
    cantidad: 4,
    motivo: 'Mismo lote desde otra bodega',
  });
  await resolver(adicionalSegunda.id);
  const devolucionesPorOrigen = (await solicitudes.catalogos(orden.id, 'DEVOLUCION')).lotes.filter(
    (l) => l.lote === 'NUEVO',
  );
  assert.equal(devolucionesPorOrigen.find((l) => l.bodegaDestinoId === origen.id).disponible, 0.5);
  const devolverSegunda = devolucionesPorOrigen.find((l) => l.bodegaDestinoId === segundaBodega.id);
  assert.equal(devolverSegunda.disponible, 4);
  const solicitudSegunda = await solicitar({
    ...devolverSegunda,
    tipo: 'DEVOLUCION',
    cantidad: 4,
    motivo: 'Retorno a su origen',
  });
  await resolver(solicitudSegunda.id);
  const retornoSegunda = await solicitudes.obtener(solicitudSegunda.id);
  assert.equal(
    (await models.MovimientoInventario.findByPk(retornoSegunda.movimientoEntradaId)).bodegaId,
    segundaBodega.id,
  );
  assert.equal((await control.obtenerDetalleControl(orden.id)).consumosMp[0].saldoEstimadoPep, 0.5);
  await assert.rejects(migrationSolicitudes.down(qi), /existen solicitudes/);
  const preparado = await models.sequelize.transaction((transaction) =>
    control.prepararCierre(orden.id, transaction),
  );
  assert.equal(preparado.produccionParcial, true);
  const antesCerrar = await models.MovimientoInventario.count();
  await models.sequelize.transaction((transaction) =>
    control.cerrarProduccion({ ordenId: orden.id, usuarioId, transaction }),
  );
  assert.equal(await models.MovimientoInventario.count(), antesCerrar);
  await orden.reload();
  assert.equal(orden.estado, 'FINALIZADA');
  await assert.rejects(parcial(1), /no tiene producción parcial iniciada/);
  await assert.rejects(migration.down(qi), /existen operaciones/);
});

test('solicitudes: PCC no puede resolver sin el permiso de la primera salida MP', () => {
  const router = require('../routes/produccion/solicitudes-mp.routes');
  const ruta = router.stack.find(
    (layer) => layer.route?.path === '/solicitudes-mp/:solicitudId/resolver',
  );
  const permiso = ruta.route.stack[0].handle;
  let status;
  let autorizado = false;
  const res = {
    status(value) {
      status = value;
      return this;
    },
    json(value) {
      return value;
    },
  };
  permiso({ permisos: ['produccion.control.editar', 'produccion.control.ver'] }, res, () => {
    autorizado = true;
  });
  assert.equal(status, 403);
  assert.equal(autorizado, false);
  permiso({ permisos: ['produccion.confirmar_salida_mp'] }, res, () => {
    autorizado = true;
  });
  assert.equal(autorizado, true);
});
