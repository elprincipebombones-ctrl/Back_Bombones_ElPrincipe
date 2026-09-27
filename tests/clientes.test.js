const test = require('node:test'),
  assert = require('node:assert/strict');
const { PGlite } = require('@electric-sql/pglite');
const { Sequelize } = require('sequelize');
const db = require('../models');
async function entorno(t) {
  const pg = new PGlite(),
    connection = {
      query(sql, p, cb) {
        if (typeof p === 'function') {
          cb = p;
          p = undefined;
        }
        (p ? pg.query(sql, p) : pg.exec(sql)).then((r) => {
          for (const x of Array.isArray(r) ? r : [r]) {
            x.rowCount = x.affectedRows;
            for (const y of x.rows || [])
              if (Array.isArray(y.column_names))
                y.column_names = '{' + y.column_names.join(',') + '}';
          }
          cb(null, r);
        }, cb);
      },
    };
  t.mock.method(db.sequelize.connectionManager, 'getConnection', async () => connection);
  t.mock.method(db.sequelize.connectionManager, 'releaseConnection', async () => {});
  t.after(() => pg.close());
  await pg.exec(
    `CREATE TABLE roles(id uuid primary key,nombre text);CREATE TABLE permissions(id uuid primary key,nombre text unique,descripcion text,modulo text,estado boolean,"createdAt" timestamptz,"updatedAt" timestamptz);CREATE TABLE role_permissions(rol_id uuid,permiso_id uuid,PRIMARY KEY(rol_id,permiso_id));CREATE TABLE proveedores(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tipo_documento varchar(20) NOT NULL,numero_documento varchar(30) NOT NULL UNIQUE,razon_social varchar(200),nombre_comercial varchar(200),telefono varchar(30),nombre_contacto_telefono varchar(150),email varchar(254),direccion varchar(250),ciudad varchar(100),estado boolean DEFAULT true,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());CREATE TABLE documentos_proveedor(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),proveedor_id uuid REFERENCES proveedores(id),tipo varchar(20),nombre_original text,clave text UNIQUE,mime_type text,tamano int,fecha_carga timestamptz,created_at timestamptz,updated_at timestamptz,UNIQUE(proveedor_id,tipo));INSERT INTO roles VALUES('00000000-0000-4000-8000-000000000001','Administrador');INSERT INTO proveedores(tipo_documento,numero_documento,razon_social) VALUES('NIT','1','Proveedor existente');`,
  );
  await require('../database/migrations/20260924000002-create-clientes').up(
    db.sequelize.getQueryInterface(),
    Sequelize,
  );
  await require('../database/migrations/20260924000003-unificar-clientes-proveedores').up(
    db.sequelize.getQueryInterface(),
    Sequelize,
  );
  return pg;
}
test('clientes reutiliza proveedores y agrega roles y permisos', async (t) => {
  const pg = await entorno(t);
  const p = (
    await pg.query("SELECT es_proveedor,es_cliente FROM proveedores WHERE numero_documento='1'")
  ).rows[0];
  assert.equal(p.es_proveedor, true);
  assert.equal(p.es_cliente, false);
  assert.equal(
    (await pg.query("SELECT count(*)::int n FROM permissions WHERE nombre LIKE 'Clientes.%'"))
      .rows[0].n,
    4,
  );
});
test('un tercero puede ser cliente y proveedor sin duplicarse', async (t) => {
  await entorno(t);
  const p = await db.Proveedor.findOne({ where: { numeroDocumento: '1' } });
  await p.update({ esCliente: true, emailFacturacionElectronica: 'facturacion@empresa.com' });
  assert.equal(await db.Proveedor.count(), 1);
  assert.equal(p.esProveedor, true);
  assert.equal(p.esCliente, true);
});
test('documento normalizado es único y almacenamiento valida firma', async (t) => {
  const pg = await entorno(t);
  await pg.exec(
    `INSERT INTO proveedores(tipo_documento,numero_documento,email_facturacion_electronica,es_cliente,es_proveedor) VALUES('CC','900 123','f@c.co',true,false)`,
  );
  await assert.rejects(
    pg.exec(
      `INSERT INTO proveedores(tipo_documento,numero_documento,email_facturacion_electronica,es_cliente,es_proveedor) VALUES('CC','900123','x@c.co',true,false)`,
    ),
  );
  const s = require('../services/proveedores/almacenamiento-documentos.service');
  assert.throws(
    () => s.guardar({ buffer: Buffer.from('falso'), mimetype: 'application/pdf' }),
    (e) => e.status === 422,
  );
});
