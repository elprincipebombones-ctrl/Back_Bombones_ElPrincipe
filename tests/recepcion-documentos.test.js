const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { PGlite } = require('@electric-sql/pglite');
const { Sequelize } = require('sequelize');
const models = require('../models');
const ctrl = require('../controllers/recepcion/documentoRecepcion.controller');
const migration = require('../database/migrations/20261125000001-documentos-recepcion');
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const respuesta = () => ({
  status(code) {
    this.code = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

test('los adjuntos se persisten con recepción y usuario y sobreviven a la recarga', async (t) => {
  const pg = new PGlite();
  const connection = {
    query(sql, params, callback) {
      if (typeof params === 'function') {
        callback = params;
        params = undefined;
      }
      (params ? pg.query(sql, params) : pg.exec(sql)).then((r) => callback(null, r), callback);
    },
  };
  t.mock.method(models.sequelize.connectionManager, 'getConnection', async () => connection);
  t.mock.method(models.sequelize.connectionManager, 'releaseConnection', async () => {});
  t.after(() => pg.close());
  await pg.exec(`CREATE TABLE usuarios(id uuid PRIMARY KEY);
    CREATE TABLE recepciones(id uuid PRIMARY KEY);
    INSERT INTO usuarios VALUES('${id(1)}'); INSERT INTO recepciones VALUES('${id(2)}');`);
  const qi = models.sequelize.getQueryInterface();
  await migration.up(qi, Sequelize);
  const documento = await models.DocumentoRecepcion.create({
    recepcionId: id(2),
    subidoPor: id(1),
    nombreArchivo: 'Certificado.pdf',
    nombreInterno: 'archivo.pdf',
    tipoArchivo: 'application/pdf',
  });
  const guardado = await models.DocumentoRecepcion.findByPk(documento.id);
  assert.equal(guardado.nombreArchivo, 'Certificado.pdf');
  assert.equal(guardado.recepcionId, id(2));
  assert.equal(guardado.subidoPor, id(1));
  await assert.rejects(
    models.DocumentoRecepcion.create({
      recepcionId: id(99),
      subidoPor: id(1),
      nombreArchivo: 'foto.png',
      nombreInterno: 'foto.png',
      tipoArchivo: 'image/png',
    }),
    /foreign key/i,
  );
  await migration.down(qi);
  assert.equal(
    (await pg.query("SELECT to_regclass('documentos_recepcion') AS tabla")).rows[0].tabla,
    null,
  );
});

test('permite fotos y PDF y conserva los metadatos del archivo y su autor', async (t) => {
  t.mock.method(models.sequelize, 'transaction', async (fn) => fn({ LOCK: { UPDATE: 'UPDATE' } }));
  t.mock.method(models.Recepcion, 'findByPk', async () => ({ id: id(2), estado: 'EN_PROCESO' }));
  t.mock.method(models.DocumentoRecepcion, 'create', async (data) => data);
  for (const tipo of ['application/pdf', 'image/jpeg', 'image/png']) {
    const res = respuesta();
    await ctrl.crear(
      {
        params: { id: id(2) },
        usuario: { id: id(1) },
        file: { originalname: 'Documento', mimetype: tipo, filename: 'interno' },
      },
      res,
      (error) => {
        throw error;
      },
    );
    assert.equal(res.code, 201);
    assert.equal(res.body.data.tipoArchivo, tipo);
    assert.equal(res.body.data.subidoPor, id(1));
  }
});

test('limpia el archivo si la recepción no existe, está cerrada o falla la persistencia', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'recepcion-adjuntos-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  t.mock.method(models.sequelize, 'transaction', async (fn) => fn({ LOCK: { UPDATE: 'UPDATE' } }));
  let estadoActual;
  t.mock.method(models.Recepcion, 'findByPk', async () =>
    estadoActual ? { id: id(2), estado: estadoActual } : null,
  );
  t.mock.method(models.DocumentoRecepcion, 'create', async () => {
    throw new Error('Fallo al guardar');
  });
  for (const estado of [null, 'TERMINADA', 'EN_PROCESO']) {
    estadoActual = estado;
    const archivo = path.join(dir, 'prueba.pdf');
    fs.writeFileSync(archivo, 'prueba');
    let fallo;
    await ctrl.crear(
      {
        params: { id: id(2) },
        usuario: { id: id(1) },
        file: {
          path: archivo,
          originalname: 'Prueba.pdf',
          mimetype: 'application/pdf',
          filename: 'prueba.pdf',
        },
      },
      respuesta(),
      (error) => {
        fallo = error;
      },
    );
    assert.ok(fallo);
    assert.equal(fs.existsSync(archivo), false);
  }
});

test('descarga solamente el documento que pertenece a la recepción solicitada', async (t) => {
  let condicion;
  t.mock.method(models.DocumentoRecepcion, 'findOne', async (options) => {
    condicion = options.where;
    return null;
  });
  const res = respuesta();
  await ctrl.descargar({ params: { id: id(2), documentoId: id(3) } }, res, (error) => {
    throw error;
  });
  assert.deepEqual(condicion, { recepcionId: id(2), id: id(3) });
  assert.equal(res.code, 404);
});
