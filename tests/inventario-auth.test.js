const test = require('node:test');
const assert = require('node:assert/strict');
const { PGlite } = require('@electric-sql/pglite');
const { injectReplacements } = require('sequelize/lib/utils/sql');
const { sequelize, Usuario } = require('../models');
const { informe, periodo } = require('../services/inventario/informes.service');
const { loginValidator } = require('../validators/auth.validator');
const { validationResult } = require('express-validator');
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

test('migración conserva usuarios y permite correo compartido con usuario único', async (t) => {
  const { Sequelize } = require('sequelize');
  const db = new PGlite();
  const database = new Sequelize('postgres://test:test@localhost/test', { logging: false });
  const connection = {
    query(sql, params, callback) {
      if (typeof params === 'function') {
        callback = params;
        params = undefined;
      }
      const result = params ? db.query(sql, params) : db.exec(sql);
      result.then((results) => {
        // pg returns name[] (OID 1003) as text; PGlite decodes it as an array.
        for (const result of Array.isArray(results) ? results : [results]) {
          for (const row of result.rows || []) {
            if (Array.isArray(row.column_names))
              row.column_names = '{' + row.column_names.join(',') + '}';
          }
        }
        callback(null, results);
      }, callback);
    },
  };
  t.mock.method(database.connectionManager, 'getConnection', async () => connection);
  t.mock.method(database.connectionManager, 'releaseConnection', async () => {});
  t.after(async () => {
    await db.close();
    await database.close();
  });
  const q = database.getQueryInterface();
  for (const name of [
    '20250101000001-create-roles',
    '20250101000002-create-usuarios',
    '20250101000003-create-permissions',
    '20250101000004-create-role-permissions',
    '20250101000005-create-menus',
    '20250101000006-create-role-menus',
  ]) {
    await require(`../database/migrations/${name}`).up(q, Sequelize);
  }
  await db.exec(`CREATE TABLE productos(id uuid primary key); CREATE TABLE detalle_movimiento(id uuid primary key);
    ALTER TABLE roles ALTER COLUMN "createdAt" SET DEFAULT NOW(), ALTER COLUMN "updatedAt" SET DEFAULT NOW();
    ALTER TABLE usuarios ALTER COLUMN "createdAt" SET DEFAULT NOW(), ALTER COLUMN "updatedAt" SET DEFAULT NOW();
    INSERT INTO roles (id,nombre) VALUES ('${id(1)}','Administrador');
    INSERT INTO usuarios (id,nombre,correo,password,rol_id) VALUES ('${id(2)}','Uno','shared@example.com','hash','${id(1)}');
    CREATE UNIQUE INDEX correo_extra_unique ON usuarios(correo);`);
  await require('../database/migrations/20260914000001-usuarios-cargos-inventario').up(
    q,
    Sequelize,
  );
  const user = (await db.query('SELECT * FROM usuarios')).rows[0];
  assert.equal(user.password, 'hash');
  assert.equal(user.usuario, 'u_' + id(2).replaceAll('-', ''));
  await db.exec(
    `INSERT INTO usuarios (id,nombre,usuario,correo,password,rol_id) VALUES ('${id(3)}','Dos','operador','shared@example.com','hash','${id(1)}')`,
  );
  await assert.rejects(
    db.exec(
      `INSERT INTO usuarios (id,nombre,usuario,correo,password,rol_id) VALUES ('${id(4)}','Tres','operador','otro@example.com','hash','${id(1)}')`,
    ),
  );
  assert.equal((await db.query('SELECT count(*)::int AS total FROM usuarios')).rows[0].total, 2);
  assert.equal(
    (await db.query("SELECT count(*)::int AS total FROM permissions WHERE modulo='Cargos'")).rows[0]
      .total,
    4,
  );
});

test('fechas inclusivas, bisiestos y fechas imposibles', () => {
  assert.equal(periodo('2024-02-01', '2024-02-29').dias, 29);
  assert.equal(periodo('2026-01-01', '2026-01-30').meses, 1);
  assert.throws(() => periodo('2026-02-30', '2026-03-01'));
  assert.throws(() => periodo('2026-02-02', '2026-02-01'));
});
test('login exige usuario, normaliza mayúsculas y rechaza correo como credencial', async () => {
  const req = { body: { usuario: ' OPERADOR.1 ', password: 'Password1' } };
  for (const v of loginValidator) await v.run(req);
  assert.ok(validationResult(req).isEmpty());
  assert.equal(req.body.usuario, 'operador.1');
  const email = { body: { correo: 'compartido@example.com', password: 'Password1' } };
  for (const v of loginValidator) await v.run(email);
  assert.equal(validationResult(email).isEmpty(), false);
});
test('usuarios comparten correo y normalizan identificador sin exponer password', () => {
  assert.equal(Usuario.rawAttributes.correo.unique, undefined);
  assert.equal(Usuario.build({ usuario: ' Persona.1 ' }).usuario, 'persona.1');
  assert.ok(Usuario.options.defaultScope.attributes.exclude.includes('password'));
});
test('informes sobre PostgreSQL real embebido: saldos, filtros, frecuencia y unidades', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`CREATE TABLE categorias_productos (id uuid primary key,nombre text,clasificacion_mp text);
    CREATE TABLE unidades_medida (id uuid primary key,simbolo text);
    CREATE TABLE productos (id uuid primary key,codigo text,nombre text,descripcion text,categoria_producto_id uuid,unidad_medida_id uuid,tipo_producto text);
    CREATE TABLE bodegas (id uuid primary key,nombre text);
    CREATE TABLE movimientos_inventario (id uuid primary key,fecha timestamptz,tipo_documento text,numero_documento text,bodega_id uuid,estado text,origen text,origen_id uuid,usuario_id uuid,observaciones text);
    CREATE TABLE detalle_movimiento (id uuid primary key,movimiento_inventario_id uuid,producto_id uuid,unidad_medida_id uuid,cantidad numeric,sentido text,lote text,lote_proveedor text,fecha_vencimiento date,observaciones text);
    INSERT INTO categorias_productos VALUES ('${id(1)}','Insumos','NO_PERECEDERA');
    INSERT INTO unidades_medida VALUES ('${id(2)}','kg'),('${id(3)}','und');
    INSERT INTO bodegas VALUES ('${id(4)}','Principal'),('${id(5)}','Secundaria');
    INSERT INTO productos VALUES ('${id(6)}','MP01','Cacao','Cacao natural','${id(1)}','${id(2)}','MATERIA_PRIMA'),
      ('${id(7)}','PT01','Bombón',null,'${id(1)}','${id(3)}','PRODUCTO_TERMINADO');`);
  const movimiento = async (
    n,
    tipo,
    fecha,
    cantidades,
    estado = 'APLICADO',
    bodega = 4,
    sentido = null,
    unidad = 2,
  ) => {
    await db.query(
      'INSERT INTO movimientos_inventario (id,fecha,tipo_documento,numero_documento,bodega_id,estado) VALUES ($1,$2,$3,$4,$5,$6)',
      [id(n), fecha, tipo, `DOC${n}`, id(bodega), estado],
    );
    for (const [i, cantidad] of cantidades.entries())
      await db.query(
        'INSERT INTO detalle_movimiento (id,movimiento_inventario_id,producto_id,unidad_medida_id,cantidad,sentido) VALUES ($1,$2,$3,$4,$5,$6)',
        [id(n * 10 + i), id(n), id(6), id(unidad), cantidad, sentido],
      );
  };
  await movimiento(10, 'EN', '2025-12-01T12:00:00Z', [100]);
  await movimiento(11, 'SA', '2026-01-01T05:00:00Z', [10, 20]);
  await movimiento(12, 'EN', '2026-01-30T23:00:00-05:00', [15]);
  await movimiento(13, 'SA', '2026-01-31T05:00:00Z', [5]);
  await movimiento(14, 'SA', '2026-01-15T12:00:00Z', [900], 'ANULADO');
  await movimiento(15, 'EN', '2026-01-15T12:00:00Z', [8], 'APLICADO', 5, null, 3);
  t.mock.method(
    sequelize,
    'query',
    async (sql, options) =>
      (await db.query(injectReplacements(sql, sequelize.dialect, options.replacements))).rows,
  );
  const filtro = { fechaDesde: '2026-01-01', fechaHasta: '2026-01-30', bodegaId: id(4) };
  const result = await informe(filtro);
  assert.equal(result.total, 2);
  const mp = result.filas.find((r) => r.codigo === 'MP01');
  assert.equal(mp.entradas, 15);
  assert.equal(mp.salidas, 30);
  assert.equal(mp.frecuencia, 1);
  assert.equal(mp.inventarioDisponible, 80);
  assert.equal(mp.promedioMensual, 30);
  assert.equal(mp.stockSeguridad, 60);
  assert.equal(result.filas.find((r) => r.codigo === 'PT01').inventarioDisponible, 0);
  await assert.rejects(
    informe({ ...filtro, tipoProducto: 'PRODUCTO_TERMINADO' }),
    (error) => error.status === 409,
  );
  assert.equal((await informe({ ...filtro, codigo: "' OR true --" })).total, 0);
  const todos = await informe({ ...filtro, bodegaId: undefined });
  assert.equal(todos.filas.filter((r) => r.codigo === 'MP01').length, 2);
  const detalle = await informe(filtro, true);
  assert.equal(detalle.total, 3);
  assert.equal((await informe({ ...filtro, pagina: 99 })).total, 2);
  await movimiento(16, 'AJ', '2025-12-10T12:00:00Z', [7]);
  assert.equal((await informe(filtro)).filas[0].inventarioDisponible, null);
});
test('exportaciones contienen datos y archivos válidos', async () => {
  const { exportar } = require('../services/inventario/exportar.service');
  const ExcelJS = require('exceljs');
  const data = {
    metadata: { fechaDesde: '2026-01-01', fechaHasta: '2026-01-30' },
    filas: [{ codigo: '=1+1', nombre: 'Cacao', salidas: 30, frecuencia: 1 }],
  };
  let output;
  const res = {
    type() {},
    attachment() {},
    send(buffer) {
      output = buffer;
    },
  };
  await exportar(res, data, 'xlsx', false);
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(output);
  assert.equal(book.getWorksheet('Informe').getCell('A2').value, '=1+1');
  await exportar(res, data, 'pdf', false);
  assert.equal(output.subarray(0, 5).toString(), '%PDF-');
});
