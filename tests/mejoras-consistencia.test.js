const test = require('node:test');
const assert = require('node:assert/strict');
const { PGlite } = require('@electric-sql/pglite');
const { injectReplacements } = require('sequelize/lib/utils/sql');
const models = require('../models');
const { siguienteCodigoCalidad } = require('../utils/codigo-calidad');
const { normalizarTextos } = require('../middleware/formato-textos');
const { obtenerGraficos } = require('../services/calidad/dashboard-calidad.service');
const migration = require('../database/migrations/20261105000001-recepcion-bodegas-y-codigos-calidad');
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

test('el middleware conserva los identificadores de permisos al normalizar su descripción', () => {
  const { formatoTextos } = require('../middleware/formato-textos');
  const req = {
    method: 'POST',
    originalUrl: '/api/permisos',
    body: { nombre: 'calidad.ver', descripcion: 'PERMITE VER CALIDAD' },
  };
  formatoTextos(req, null, () => {});
  assert.equal(req.body.nombre, 'calidad.ver');
  assert.equal(req.body.descripcion, 'Permite ver calidad');
});

test('el CRUD de calidad genera códigos incluso para catálogos compartidos y conserva los existentes al editar', async () => {
  const crearCrud = require('../controllers/calidad/crearCrud');
  let entrada;
  let cambio;
  const modelo = {
    rawAttributes: { codigo: {} },
    sequelize: { query: async () => [[{ consecutivo: '42' }]] },
    findOne: async () => null,
    create: async (body) => {
      entrada = { ...body };
      return entrada;
    },
    findByPk: async () => ({
      id: id(1),
      codigo: 'HISTORICO',
      update: async (body) => {
        cambio = { ...body };
      },
    }),
  };
  const ctrl = crearCrud({ modelo, nombre: 'Unidad de medida', campoUnico: 'codigo' });
  const res = {
    status() {
      return this;
    },
    json() {
      return this;
    },
  };
  const next = (error) => {
    throw error;
  };
  await ctrl.crear({ body: { nombre: 'Kilogramo', codigo: 'CODIGO-CLIENTE' } }, res, next);
  assert.equal(entrada.codigo, 'CA-000042');
  await ctrl.actualizar(
    { params: { id: id(1) }, body: { nombre: 'Kilogramos', codigo: 'CAMBIAR-HISTORICO' } },
    res,
    next,
  );
  assert.equal(Object.hasOwn(cambio, 'codigo'), false);
});

test('las validaciones de calidad permiten crear sin código y las fechas de órdenes rechazan rangos invertidos', async () => {
  const { validationResult } = require('express-validator');
  const validadores = [
    require('../validators/calidad/catalogos.validator').crearCatalogoValidator,
    require('../validators/calidad/checklists.validator').crearCriterioValidator,
    require('../validators/calidad/campos-accion.validator').crearCampoValidator,
    require('../validators/reglas/reglas.validator').crearReglaValidator,
  ];
  for (const reglas of validadores) {
    const req = { body: {}, params: {}, query: {} };
    for (const regla of reglas) await regla.run(req);
    assert.equal(
      validationResult(req)
        .array()
        .some((e) => e.path === 'codigo'),
      false,
    );
  }
  const reglas =
    require('../validators/produccion/orden-produccion.validator').listarOrdenesValidator;
  const req = { query: { estado: 'TODAS', fechaDesde: '2026-11-05', fechaHasta: '2026-11-01' } };
  for (const regla of reglas) await regla.run(req);
  assert.equal(
    validationResult(req)
      .array()
      .some((e) => e.path === 'fechaHasta'),
    true,
  );
});

test('órdenes combina filtros de estado, número, fechas y producto sin recortar los detalles', async (t) => {
  const { Op } = require('sequelize');
  const ctrl = require('../controllers/produccion/orden-produccion.controller');
  let opciones;
  t.mock.method(models.OrdenProduccionDetalle, 'findAll', async (options) => {
    assert.equal(options.where.productoTerminadoId, id(8));
    return [{ ordenProduccionId: id(9) }];
  });
  t.mock.method(models.OrdenProduccion, 'findAll', async (options) => {
    opciones = options;
    return [];
  });
  const res = {
    status() {
      return this;
    },
    json() {
      return this;
    },
  };
  const next = (error) => {
    throw error;
  };
  await ctrl.listar(
    {
      query: {
        estado: 'FINALIZADA',
        buscar: 'OT-10',
        fechaDesde: '2026-11-01',
        fechaHasta: '2026-11-05',
        productoId: id(8),
      },
    },
    res,
    next,
  );
  assert.equal(opciones.where.estado, 'FINALIZADA');
  assert.equal(opciones.where.numero[Op.iLike], '%OT-10%');
  assert.equal(opciones.where.fecha[Op.gte], '2026-11-01');
  assert.equal(opciones.where.fecha[Op.lte], '2026-11-05');
  assert.deepEqual(opciones.where.id[Op.in], [id(9)]);
  assert.equal(opciones.include.find((i) => i.as === 'detalles').where, undefined);
  await ctrl.listar({ query: { estado: 'TODAS' } }, res, next);
  assert.equal(Object.hasOwn(opciones.where, 'estado'), false);
});

function adaptador(pg) {
  const database = {
    async query(sql, options = {}) {
      const statement = injectReplacements(
        sql,
        models.sequelize.dialect,
        options.replacements || {},
      );
      const resultados = await pg.exec(statement);
      const rows = resultados.at(-1)?.rows || [];
      return options.type === 'SELECT' ? rows : [rows, {}];
    },
    async transaction(callback) {
      await pg.exec('BEGIN');
      try {
        const valor = await callback({});
        await pg.exec('COMMIT');
        return valor;
      } catch (error) {
        await pg.exec('ROLLBACK');
        throw error;
      }
    },
  };
  return database;
}

test('normaliza textos naturales anidados y conserva claves, códigos, correos y unidades', () => {
  const datos = {
    nombre: '  ÁREA DE CALIDAD  ',
    pregunta: '¿ESTÁ LIMPIO?',
    correo: 'Nombre@Empresa.CO',
    password: 'ClaveABC',
    codigo: 'MP-001',
    simbolo: 'mL',
    detalles: [{ observaciones: 'RECIBIDO CON NOVEDAD', loteProveedor: 'ABC-1' }],
  };
  normalizarTextos(datos);
  assert.equal(datos.nombre, 'Área de calidad');
  assert.equal(datos.pregunta, '¿Está limpio?');
  assert.equal(datos.detalles[0].observaciones, 'Recibido con novedad');
  assert.equal(datos.correo, 'Nombre@Empresa.CO');
  assert.equal(datos.password, 'ClaveABC');
  assert.equal(datos.codigo, 'MP-001');
  assert.equal(datos.simbolo, 'mL');
  assert.equal(datos.detalles[0].loteProveedor, 'ABC-1');
});

test('los modelos de calidad generan código sin pedirlo y conservan los históricos', async (t) => {
  let secuencia = 0;
  t.mock.method(models.sequelize, 'query', async () => [[{ consecutivo: String(++secuencia) }]]);
  const parametro = models.ParametroCalidad.build({ nombre: 'Temperatura', tipoCampoId: id(1) });
  const criterio = models.CriterioInspeccion.build({
    nombre: 'Limpieza',
    pregunta: '¿Está limpio?',
    tipoCampoId: id(1),
  });
  await parametro.validate();
  await criterio.validate();
  assert.equal(parametro.codigo, 'CA-000001');
  assert.equal(criterio.codigo, 'CA-000002');
  const historico = models.ParametroCalidad.build(
    { ...parametro.get({ plain: true }), codigo: 'TEMP-CAVA' },
    { isNewRecord: false },
  );
  await historico.validate();
  assert.equal(historico.codigo, 'TEMP-CAVA');
  assert.equal(secuencia, 2);
});

test('la migración conserva códigos y bodegas históricas y evita entradas duplicadas por destino', async () => {
  const pg = await PGlite.create();
  try {
    await pg.exec(`
      CREATE TABLE bodegas(id uuid PRIMARY KEY);
      CREATE TABLE recepciones(id uuid PRIMARY KEY, bodega_id uuid NOT NULL REFERENCES bodegas(id));
      CREATE TABLE detalles_recepcion(id uuid PRIMARY KEY, recepcion_id uuid REFERENCES recepciones(id));
      CREATE TABLE movimientos_inventario(id uuid PRIMARY KEY, origen text, origen_id uuid, tipo_documento text, bodega_id uuid REFERENCES bodegas(id), CONSTRAINT movimientos_inventario_origen_tipo_unique UNIQUE(origen,origen_id,tipo_documento));
      CREATE TABLE parametros_calidad(codigo text UNIQUE);
      INSERT INTO parametros_calidad VALUES ('TEMP-CAVA'), ('CA-000123');
      INSERT INTO bodegas VALUES ('${id(1)}'), ('${id(2)}');
      INSERT INTO recepciones VALUES ('${id(3)}','${id(1)}');
      INSERT INTO detalles_recepcion VALUES ('${id(4)}','${id(3)}');
      INSERT INTO movimientos_inventario VALUES ('${id(5)}','RECEPCION','${id(3)}','EN','${id(1)}');
    `);
    const database = adaptador(pg);
    const qi = {
      sequelize: database,
      queryGenerator: models.sequelize.getQueryInterface().queryGenerator,
    };
    await migration.up(qi);
    assert.equal(
      (await pg.query('SELECT bodega_id FROM detalles_recepcion')).rows[0].bodega_id,
      id(1),
    );
    const codigos = await Promise.all(
      Array.from({ length: 20 }, () => siguienteCodigoCalidad(database)),
    );
    assert.equal(codigos[0], 'CA-000124');
    assert.equal(new Set(codigos).size, 20);
    assert.deepEqual(
      (await pg.query('SELECT codigo FROM parametros_calidad ORDER BY codigo')).rows.map(
        (r) => r.codigo,
      ),
      ['CA-000123', 'TEMP-CAVA'],
    );
    await pg.exec(
      `INSERT INTO movimientos_inventario VALUES ('${id(6)}','RECEPCION','${id(3)}','EN','${id(2)}')`,
    );
    await assert.rejects(
      pg.exec(
        `INSERT INTO movimientos_inventario VALUES ('${id(7)}','RECEPCION','${id(3)}','EN','${id(2)}')`,
      ),
      /unique/i,
    );
    await pg.exec(
      `INSERT INTO movimientos_inventario VALUES ('${id(8)}','OT','${id(9)}','EN','${id(1)}')`,
    );
    await assert.rejects(
      pg.exec(
        `INSERT INTO movimientos_inventario VALUES ('${id(10)}','OT','${id(9)}','EN','${id(2)}')`,
      ),
      /unique/i,
    );
    await pg.exec(`INSERT INTO detalles_recepcion VALUES ('${id(11)}','${id(3)}','${id(2)}')`);
    await assert.rejects(migration.down(qi), /varias bodegas/);
  } finally {
    await pg.close();
  }
});

test('los gráficos muestran siete fechas reales y acciones cerradas independientes de inspecciones', async () => {
  const pg = await PGlite.create();
  try {
    await pg.exec(`
      CREATE TABLE programaciones_formato(id int, formato_calidad_id int, activo boolean, fecha_inicio date, fecha_fin date);
      CREATE TABLE dias_programacion(programacion_formato_id int, dia_semana int);
      CREATE TABLE versiones_formato(id int, formato_calidad_id int);
      CREATE TABLE inspecciones(version_formato_id int, fecha_inspeccion date);
      CREATE TABLE acciones_correctivas(estado text);
      INSERT INTO programaciones_formato VALUES(1,1,true,'2026-11-01',null);
      INSERT INTO dias_programacion VALUES(1,4);
      INSERT INTO versiones_formato VALUES(1,1);
      INSERT INTO inspecciones VALUES(1,'2026-11-05'),(1,'2026-11-05');
      INSERT INTO acciones_correctivas VALUES('CERRADA'),('CERRADA'),('EN_PROCESO'),('PENDIENTE_APROBACION'),('PENDIENTE');
    `);
    const datos = await obtenerGraficos('2026-11-05', adaptador(pg));
    assert.equal(datos.serie_semanal.length, 7);
    const ultimo = datos.serie_semanal.at(-1);
    assert.equal(ultimo.programadas, 1);
    assert.equal(ultimo.ejecutadas, 1);
    assert.deepEqual(datos.acciones_por_estado, {
      pendientes: 1,
      en_proceso: 1,
      por_aprobar: 1,
      cerradas: 2,
    });
    await pg.exec('DELETE FROM acciones_correctivas; DELETE FROM programaciones_formato');
    const vacio = await obtenerGraficos('2026-11-05', adaptador(pg));
    assert.equal(
      vacio.serie_semanal.every((d) => d.programadas === 0 && d.ejecutadas === 0),
      true,
    );
    assert.equal(vacio.acciones_por_estado.cerradas, 0);
  } finally {
    await pg.close();
  }
});
