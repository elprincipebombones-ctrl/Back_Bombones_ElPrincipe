const test = require('node:test');
const assert = require('node:assert/strict');
const { PGlite } = require('@electric-sql/pglite');
const { injectReplacements } = require('sequelize/lib/utils/sql');
const sequelize = require('../database/database');
const CategoriaProducto = require('../models/Recepcion/CategoriaProducto');
const Bodega = require('../models/Inventario/Bodega');
const categorias = require('../controllers/recepcion/categoriaProducto.controller');
const bodegas = require('../controllers/Inventario/bodega.controller');
const migration = require('../database/migrations/20261105000002-codigos-internos-maestros');
const { siguienteCodigoMaestro } = require('../utils/codigo-maestro');
const { validationResult } = require('express-validator');
const validadores = require('../validators/maestro.validator');

const respuesta = () => ({
  status() {
    return this;
  },
  json() {
    return this;
  },
});
const next = (error) => {
  throw error;
};

test('las validaciones aceptan categorías y bodegas sin código', async () => {
  for (const [reglas, body] of [
    [
      validadores.crearCategoriaProductoValidator,
      { nombre: 'Empaques', clasificacionMp: 'NO_PERECEDERA' },
    ],
    [validadores.crearBodegaValidator, { nombre: 'Principal', tipo: 'Materia prima' }],
  ]) {
    const req = { body, params: {}, query: {} };
    for (const regla of reglas) await regla.run(req);
    assert.deepEqual(validationResult(req).array(), []);
  }
});

test('crear y editar categorías usa el código del servidor y conserva el histórico', async (t) => {
  let creado;
  let actualizado;
  t.mock.method(sequelize, 'query', async () => [[{ consecutivo: '12' }]]);
  t.mock.method(CategoriaProducto, 'create', async (body) => {
    creado = body;
    return body;
  });
  t.mock.method(CategoriaProducto, 'findByPk', async () => ({
    codigo: 'MP-CAR',
    update: async (body) => {
      actualizado = body;
    },
  }));
  await categorias.crear(
    { body: { nombre: 'Empaques', codigo: 'MANUAL', clasificacionMp: 'NO_PERECEDERA' } },
    respuesta(),
    next,
  );
  assert.equal(creado.codigo, 'CP-000012');
  await categorias.actualizar(
    { params: { id: '1' }, body: { nombre: 'Empaque', codigo: 'CAMBIO' } },
    respuesta(),
    next,
  );
  assert.deepEqual(actualizado, { nombre: 'Empaque' });
});

test('bodegas genera el código dentro de la transacción y conserva la selección de PT', async (t) => {
  const transaction = {};
  const operaciones = [];
  let creado;
  let actualizado;
  t.mock.method(sequelize, 'transaction', async (cb) => cb(transaction));
  t.mock.method(sequelize, 'query', async (_sql, options) => {
    assert.equal(options.transaction, transaction);
    return [[{ consecutivo: '7' }]];
  });
  t.mock.method(Bodega, 'update', async (body, options) => {
    assert.equal(options.transaction, transaction);
    operaciones.push(body);
  });
  t.mock.method(Bodega, 'create', async (body, options) => {
    assert.equal(options.transaction, transaction);
    creado = body;
    return body;
  });
  t.mock.method(Bodega, 'findByPk', async () => ({
    id: '1',
    codigo: 'HISTORICO',
    update: async (body) => {
      actualizado = body;
    },
  }));
  await bodegas.crear(
    {
      body: { nombre: 'PT', tipo: 'Producto terminado', codigo: 'MANUAL', esBodegaPtDefault: true },
    },
    respuesta(),
    next,
  );
  assert.equal(creado.codigo, 'BD-000007');
  assert.equal(creado.esBodegaPtDefault, true);
  assert.deepEqual(operaciones, [{ esBodegaPtDefault: false }]);
  await bodegas.actualizar(
    { params: { id: '1' }, body: { codigo: 'CAMBIO', estado: false } },
    respuesta(),
    next,
  );
  assert.deepEqual(actualizado, { estado: false, esBodegaPtDefault: false });
});

test('la migración continúa cada consecutivo sin cambiar históricos y admite asignaciones simultáneas', async () => {
  const pg = await PGlite.create();
  try {
    await pg.exec(`
      CREATE TABLE categorias_productos(codigo text UNIQUE NOT NULL);
      CREATE TABLE bodegas(codigo text UNIQUE NOT NULL);
      INSERT INTO categorias_productos VALUES ('MP-CAR'), ('CP-000042');
      INSERT INTO bodegas VALUES ('ANTIGUA'), ('BD-000003');
    `);
    const database = {
      async query(sql, options = {}) {
        const resultados = await pg.exec(
          injectReplacements(sql, sequelize.dialect, options.replacements || {}),
        );
        return [resultados.at(-1)?.rows || [], {}];
      },
      async transaction(callback) {
        await pg.exec('BEGIN');
        try {
          const result = await callback({});
          await pg.exec('COMMIT');
          return result;
        } catch (error) {
          await pg.exec('ROLLBACK');
          throw error;
        }
      },
    };
    const qi = {
      sequelize: database,
      queryGenerator: sequelize.getQueryInterface().queryGenerator,
    };
    await migration.up(qi);
    const cp = await Promise.all(
      Array.from({ length: 25 }, () => siguienteCodigoMaestro('categoriaProducto', database)),
    );
    const bd = await Promise.all(
      Array.from({ length: 25 }, () => siguienteCodigoMaestro('bodega', database)),
    );
    assert.equal(cp[0], 'CP-000043');
    assert.equal(bd[0], 'BD-000004');
    assert.equal(new Set(cp).size, 25);
    assert.equal(new Set(bd).size, 25);
    assert.deepEqual(
      (await pg.query('SELECT codigo FROM categorias_productos ORDER BY codigo')).rows.map(
        (r) => r.codigo,
      ),
      ['CP-000042', 'MP-CAR'],
    );
    assert.deepEqual(
      (await pg.query('SELECT codigo FROM bodegas ORDER BY codigo')).rows.map((r) => r.codigo),
      ['ANTIGUA', 'BD-000003'],
    );
    await migration.down(qi);
    await assert.rejects(siguienteCodigoMaestro('bodega', database), /does not exist/);
    assert.equal((await pg.query('SELECT COUNT(*)::int AS total FROM bodegas')).rows[0].total, 2);
    await pg.exec('TRUNCATE categorias_productos, bodegas');
    await migration.up(qi);
    assert.equal(await siguienteCodigoMaestro('categoriaProducto', database), 'CP-000001');
    assert.equal(await siguienteCodigoMaestro('bodega', database), 'BD-000001');
  } finally {
    await pg.close();
  }
});
