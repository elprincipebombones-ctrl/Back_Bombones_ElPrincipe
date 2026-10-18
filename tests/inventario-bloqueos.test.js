const test = require('node:test');
const assert = require('node:assert/strict');
const { PGlite } = require('@electric-sql/pglite');
const { Sequelize } = require('sequelize');
const models = require('../models');
const bloqueos = require('../services/inventario/bloqueos.service');

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

async function entorno(t) {
  const pg = new PGlite();
  const connection = {
    query(sql, params, callback) {
      if (typeof params === 'function') {
        callback = params;
        params = undefined;
      }
      (params ? pg.query(sql, params) : pg.exec(sql)).then((result) => {
        for (const item of Array.isArray(result) ? result : [result]) {
          item.rowCount = item.affectedRows;
          for (const row of item.rows || [])
            if (Array.isArray(row.column_names)) row.column_names = `{${row.column_names.join(',')}}`;
        }
        callback(null, result);
      }, callback);
    },
  };
  t.mock.method(models.sequelize.connectionManager, 'getConnection', async () => connection);
  t.mock.method(models.sequelize.connectionManager, 'releaseConnection', async () => {});
  t.after(() => pg.close());
  await pg.exec(`
    CREATE TABLE roles(id uuid PRIMARY KEY,nombre text);
    CREATE TABLE usuarios(id uuid PRIMARY KEY,nombre text,correo text,usuario text,password text,rol_id uuid,estado boolean DEFAULT true,"createdAt" timestamptz DEFAULT now(),"updatedAt" timestamptz DEFAULT now());
    CREATE TABLE permissions(id uuid PRIMARY KEY,nombre text UNIQUE,descripcion text,modulo text,estado boolean,"createdAt" timestamptz,"updatedAt" timestamptz);
    CREATE TABLE role_permissions(rol_id uuid,permiso_id uuid,PRIMARY KEY(rol_id,permiso_id));
    CREATE TABLE categorias_productos(id uuid PRIMARY KEY,codigo text,nombre text);
    CREATE TABLE productos(id uuid PRIMARY KEY,codigo text,nombre text,categoria_producto_id uuid,unidad_medida_id uuid,estado boolean DEFAULT true);
    CREATE TABLE bodegas(id uuid PRIMARY KEY,codigo text,nombre text,tipo text,descripcion text,direccion text,responsable_id uuid,estado boolean DEFAULT true,es_bodega_pt_default boolean DEFAULT false,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
    CREATE TABLE unidades_medida(id uuid PRIMARY KEY,codigo text,nombre text,simbolo text,estado boolean DEFAULT true);
    CREATE TABLE inspecciones(id uuid PRIMARY KEY);
    CREATE TABLE acciones_correctivas(id uuid PRIMARY KEY);
    CREATE TABLE movimientos_inventario(id uuid PRIMARY KEY,tipo_documento text,numero_documento text,fecha timestamptz,bodega_id uuid,estado text,usuario_id uuid);
    CREATE TABLE detalle_movimiento(id uuid PRIMARY KEY,movimiento_inventario_id uuid,producto_id uuid,unidad_medida_id uuid,cantidad numeric(15,3),sentido text,lote text,lote_proveedor text,fecha_vencimiento date);
    INSERT INTO roles VALUES('${id(1)}','Administrador');
    INSERT INTO usuarios(id,nombre,usuario,password,rol_id) VALUES('${id(2)}','Congelador','uno','hash','${id(1)}'),('${id(3)}','Liberador','dos','hash','${id(1)}');
    INSERT INTO categorias_productos VALUES('${id(4)}','CAT','Categoría');
    INSERT INTO unidades_medida VALUES('${id(5)}','KG','Kilogramo','kg',true);
    INSERT INTO productos VALUES('${id(6)}','MP-1','Cacao','${id(4)}','${id(5)}',true);
    INSERT INTO bodegas VALUES('${id(7)}','PEP-1','Proceso','PRODUCTO_EN_PROCESO',true);
    INSERT INTO movimientos_inventario VALUES('${id(8)}','EN','INICIAL',CURRENT_TIMESTAMP,'${id(7)}','APLICADO','${id(2)}');
    INSERT INTO detalle_movimiento VALUES('${id(9)}','${id(8)}','${id(6)}','${id(5)}',12.5,'ENTRADA',NULL,NULL,NULL);
  `);
  await require('../database/migrations/20261017000001-inventario-bloqueos-lote').up(
    models.sequelize.getQueryInterface(),
    Sequelize,
  );
  return pg;
}

const clave = () => ({
  productoId: id(6),
  bodegaId: id(7),
  unidadMedidaId: id(5),
  lote: '',
  fechaVencimiento: '',
});

test('congela una existencia sin lote/vencimiento sin alterar el saldo y audita al autenticado', async (t) => {
  const pg = await entorno(t);
  const bloqueo = await bloqueos.congelar(
    {
      ...clave(),
      motivo: ' Pendiente de Calidad ',
      origen: 'CALIDAD',
      congeladoPorId: id(99),
      congeladoEn: '2000-01-01T00:00:00.000Z',
    },
    id(2),
    { ip: '127.0.0.1' },
  );
  assert.equal(bloqueo.estado, 'CONGELADO');
  assert.equal(bloqueo.lote, null);
  assert.equal(bloqueo.fechaVencimiento, null);
  assert.equal(bloqueo.motivo, 'Pendiente de Calidad');
  assert.equal(bloqueo.congeladoPorId, id(2));
  assert.notEqual(new Date(bloqueo.congeladoEn).getUTCFullYear(), 2000);
  assert.equal(await bloqueos.saldoFisico(clave()), '12.500');
  const evento = (await pg.query('SELECT * FROM inventario_eventos_auditoria')).rows[0];
  assert.equal(evento.evento, 'INVENTARIO_EXISTENCIA_CONGELADA');
  assert.equal(evento.usuario_id, id(2));
  assert.equal(evento.ip, '127.0.0.1');
});

test('impide bloqueo activo duplicado aun normalizando blancos a null', async (t) => {
  await entorno(t);
  await bloqueos.congelar({ ...clave(), motivo: 'Primero' }, id(2));
  await assert.rejects(
    bloqueos.congelar({ ...clave(), lote: null, fechaVencimiento: null, motivo: 'Segundo' }, id(2)),
    (error) => error.status === 409 && error.errors?.codigo === 'EXISTENCIA_YA_CONGELADA',
  );
});

test('rechaza existencia inexistente y no crea bloqueo ni auditoría', async (t) => {
  const pg = await entorno(t);
  await assert.rejects(
    bloqueos.congelar({ ...clave(), lote: 'NO-EXISTE', motivo: 'No aplica' }, id(2)),
    (error) => error.status === 404,
  );
  assert.equal((await pg.query('SELECT count(*)::int n FROM inventario_bloqueos_lote')).rows[0].n, 0);
  assert.equal((await pg.query('SELECT count(*)::int n FROM inventario_eventos_auditoria')).rows[0].n, 0);
});

test('verificación de uso responde 409, detalla el bloqueo y audita el intento', async (t) => {
  const pg = await entorno(t);
  const creado = await bloqueos.congelar({ ...clave(), motivo: 'Retenido' }, id(2));
  await assert.rejects(
    bloqueos.verificarDisponible(clave(), { usuarioId: id(3), ip: '10.0.0.8' }),
    (error) =>
      error.status === 409 &&
      error.errors?.codigo === 'EXISTENCIA_CONGELADA' &&
      error.errors?.bloqueoId === creado.id,
  );
  const eventos = (await pg.query('SELECT evento,usuario_id FROM inventario_eventos_auditoria ORDER BY ocurrido_en')).rows;
  assert.deepEqual(eventos.map((e) => e.evento), [
    'INVENTARIO_EXISTENCIA_CONGELADA',
    'INTENTO_USO_EXISTENCIA_CONGELADA',
  ]);
  assert.equal(eventos[1].usuario_id, id(3));
});

test('libera explícitamente, conserva historial y permite volver a congelar', async (t) => {
  const pg = await entorno(t);
  const creado = await bloqueos.congelar({ ...clave(), motivo: 'Inspección' }, id(2));
  const liberado = await bloqueos.liberar(creado.id, ' Aprobado por Calidad ', id(3));
  assert.equal(liberado.estado, 'LIBERADO');
  assert.equal(liberado.liberadoPorId, id(3));
  assert.equal(liberado.notaLiberacion, 'Aprobado por Calidad');
  assert.ok(liberado.liberadoEn);
  assert.equal((await bloqueos.estadoExistencia(clave())).estadoDisponibilidad, 'DISPONIBLE');
  await assert.doesNotReject(bloqueos.verificarDisponible(clave()));
  const nuevo = await bloqueos.congelar({ ...clave(), motivo: 'Nueva revisión' }, id(2));
  assert.notEqual(nuevo.id, creado.id);
  const historial = await bloqueos.listar({ productoId: id(6) }, true);
  assert.equal(historial.total, 2);
  assert.deepEqual(new Set(historial.filas.map((b) => b.estado)), new Set(['CONGELADO', 'LIBERADO']));
  assert.equal((await pg.query('SELECT count(*)::int n FROM inventario_eventos_auditoria')).rows[0].n, 3);
});

test('el índice parcial protege la integridad aunque se omita el servicio', async (t) => {
  const pg = await entorno(t);
  await bloqueos.congelar({ ...clave(), motivo: 'Solicitud A' }, id(2));
  await assert.rejects(
    pg.query(`INSERT INTO inventario_bloqueos_lote
      (producto_id,bodega_id,unidad_medida_id,lote,fecha_vencimiento,estado,motivo,congelado_por_id,congelado_en,created_at,updated_at)
      VALUES($1,$2,$3,NULL,NULL,'CONGELADO','Solicitud directa',$4,now(),now(),now())`,
    [id(6), id(7), id(5), id(3)]),
  );
  assert.equal((await pg.query("SELECT count(*)::int n FROM inventario_bloqueos_lote WHERE estado='CONGELADO'")).rows[0].n, 1);
});
