const test = require('node:test');
const assert = require('node:assert/strict');
const { PGlite } = require('@electric-sql/pglite');
const { Sequelize } = require('sequelize');
const models = require('../models');
const operaciones = require('../services/inventario/operaciones.service');
const consultas = require('../services/inventario/consultas.service');
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
        for (const r of Array.isArray(result) ? result : [result]) {
          r.rowCount = r.affectedRows;
          for (const row of r.rows || [])
            if (Array.isArray(row.column_names))
              row.column_names = '{' + row.column_names.join(',') + '}';
        }
        callback(null, result);
      }, callback);
    },
  };
  t.mock.method(models.sequelize.connectionManager, 'getConnection', async () => connection);
  t.mock.method(models.sequelize.connectionManager, 'releaseConnection', async () => {});
  t.after(() => pg.close());
  await pg.exec(`
    CREATE TABLE usuarios(id uuid PRIMARY KEY);
    CREATE TABLE roles(id uuid PRIMARY KEY,nombre text);
    CREATE TABLE permissions(id uuid PRIMARY KEY,nombre text UNIQUE,descripcion text,modulo text,estado boolean,"createdAt" timestamptz,"updatedAt" timestamptz);
    CREATE TABLE role_permissions(rol_id uuid,permiso_id uuid,PRIMARY KEY(rol_id,permiso_id));
    CREATE TABLE categorias_productos(id uuid PRIMARY KEY,codigo text,nombre text,descripcion text,clasificacion_mp text,requiere_lote boolean DEFAULT false,requiere_fecha_vencimiento boolean DEFAULT false,requiere_temperatura boolean DEFAULT false,estado boolean DEFAULT true,created_at timestamptz,updated_at timestamptz);
    CREATE TABLE unidades_medida(id uuid PRIMARY KEY,codigo text,nombre text,simbolo text,estado boolean DEFAULT true,created_at timestamptz,updated_at timestamptz);
    CREATE TABLE productos(id uuid PRIMARY KEY,codigo text,nombre text,descripcion text,categoria_producto_id uuid,unidad_medida_id uuid,estado boolean DEFAULT true,created_at timestamptz,updated_at timestamptz,tipo_producto text);
    CREATE TABLE bodegas(id uuid PRIMARY KEY,codigo text,nombre text,tipo text,descripcion text,direccion text,responsable_id uuid,estado boolean DEFAULT true,created_at timestamptz,updated_at timestamptz);
    CREATE TABLE movimientos_inventario(id uuid PRIMARY KEY,tipo_documento text,numero_documento text UNIQUE,fecha timestamptz,bodega_id uuid,estado text,origen text,origen_id uuid,usuario_id uuid,observaciones text,created_at timestamptz,updated_at timestamptz,UNIQUE(origen,origen_id));
    CREATE TABLE detalle_movimiento(id uuid PRIMARY KEY,movimiento_inventario_id uuid REFERENCES movimientos_inventario(id),producto_id uuid,unidad_medida_id uuid,cantidad numeric(15,3) CHECK(cantidad>0),sentido text,lote text,lote_proveedor text,fecha_vencimiento date,costo_unitario numeric,costo_total numeric,observaciones text,created_at timestamptz,updated_at timestamptz);
    INSERT INTO usuarios VALUES('${id(1)}');
    INSERT INTO roles VALUES('${id(1)}','Administrador');
    INSERT INTO categorias_productos(id,codigo,nombre,clasificacion_mp) VALUES('${id(2)}','CAT','Categoría','NO_PERECEDERA');
    INSERT INTO unidades_medida(id,codigo,nombre,simbolo) VALUES('${id(3)}','KG','Kilogramos','kg');
    INSERT INTO productos(id,codigo,nombre,categoria_producto_id,unidad_medida_id) VALUES('${id(4)}','P01','Producto 1','${id(2)}','${id(3)}'),('${id(5)}','P02','Producto 2','${id(2)}','${id(3)}');
    UPDATE productos SET tipo_producto='PT' WHERE id='${id(4)}';
    INSERT INTO bodegas(id,codigo,nombre,tipo) VALUES('${id(6)}','B1','Principal','GENERAL'),('${id(7)}','B2','Destino 1','GENERAL'),('${id(8)}','B3','Destino 2','GENERAL');
    INSERT INTO movimientos_inventario(id,tipo_documento,numero_documento,fecha,bodega_id,estado) VALUES('${id(10)}','EN','INICIAL','2020-01-01T12:00:00Z','${id(6)}','APLICADO');
    INSERT INTO detalle_movimiento(id,movimiento_inventario_id,producto_id,unidad_medida_id,cantidad) VALUES('${id(11)}','${id(10)}','${id(4)}','${id(3)}',10),('${id(12)}','${id(10)}','${id(5)}','${id(3)}',8);
  `);
  await require('../database/migrations/20260915000001-inventario-fisico-traslados').up(
    models.sequelize.getQueryInterface(),
    Sequelize,
  );
  return pg;
}
test('conteo: nota obligatoria, ajustes EN/SA, inmutabilidad y aplicación idempotente', async (t) => {
  const pg = await entorno(t);
  assert.equal(
    (
      await pg.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name='productos' AND column_name='tipo_producto'",
      )
    ).rows.length,
    1,
  );
  assert.equal(models.Producto.rawAttributes.tipoProducto, undefined);
  assert.equal((await pg.query('SELECT tipo_producto FROM productos WHERE id=$1', [id(4)])).rows[0].tipo_producto, 'PT');
  const op = await operaciones.guardarConteo(
    {
      bodegaId: id(6),
      detalles: [
        { productoId: id(4), cantidadContada: '12.000' },
        { productoId: id(5), cantidadContada: '3' },
      ],
    },
    id(1),
  );
  assert.equal(op.estado, 'BORRADOR');
  assert.deepEqual(op.detalles.map((d) => String(d.cantidad)).sort(), ['-5.000', '2.000']);
  await assert.rejects(operaciones.aplicarConteo(op.id, ' ', id(1)), (e) => e.status === 422);
  const aplicado = await operaciones.aplicarConteo(op.id, 'Diferencia verificada en conteo', id(1));
  assert.equal(aplicado.estado, 'APLICADO');
  assert.equal(aplicado.documentos.length, 2);
  assert.deepEqual(aplicado.documentos.map((d) => d.tipoDocumento).sort(), ['EN', 'SA']);
  assert.ok(
    aplicado.documentos.every(
      (d) => d.bodegaId === id(6) && d.observaciones === 'Diferencia verificada en conteo',
    ),
  );
  assert.equal((await operaciones.aplicarConteo(op.id, 'otro', id(1))).documentos.length, 2);
  await assert.rejects(operaciones.anularConteo(op.id), (e) => e.status === 409);
  await assert.rejects(
    operaciones.guardarConteo(
      { bodegaId: id(6), detalles: [{ productoId: id(4), cantidadContada: 20 }] },
      id(1),
      op.id,
    ),
    (e) => e.status === 409,
  );
  const stock = await consultas.existencias({ bodegaId: id(6), productoId: id(4) });
  assert.equal(stock.filas[0].inventarioDisponible, '12.000');
  const kardex = await consultas.kardex({
    productoId: id(4),
    bodegaId: id(6),
    fechaDesde: '2021-01-01',
    fechaHasta: '2099-01-01',
  });
  assert.equal(kardex.saldos[0].saldoInicial, '10.000');
  assert.equal(kardex.saldos[0].saldoFinal, '12.000');
  assert.equal(kardex.filas[0].saldo, '12.000');
});
test('traslado a varios destinos: valida el total, revierte fallos y no duplica reintentos', async (t) => {
  const pg = await entorno(t);
  const body = {
    bodegaId: id(6),
    idempotencia: id(40),
    nota: 'Reposición',
    detalles: [
      { productoId: id(4), bodegaDestinoId: id(7), cantidad: 6 },
      { productoId: id(4), bodegaDestinoId: id(8), cantidad: 5 },
    ],
  };
  await assert.rejects(operaciones.trasladar(body, id(1)), (e) => e.status === 409);
  assert.equal(
    (await pg.query('SELECT COUNT(*)::int AS n FROM operaciones_inventario')).rows[0].n,
    0,
  );
  body.detalles[1].cantidad = 4;
  const op = await operaciones.trasladar(body, id(1));
  assert.equal(op.documentos.length, 3);
  assert.equal(op.documentos.filter((d) => d.tipoDocumento === 'SA').length, 1);
  assert.equal((await operaciones.trasladar(body, id(1))).id, op.id);
  await assert.rejects(
    operaciones.trasladar({ ...body, nota: 'Otra solicitud' }, id(1)),
    (e) => e.status === 409,
  );
  const stock = await consultas.existencias({ productoId: id(4) });
  assert.deepEqual(
    stock.filas.map((r) => r.inventarioDisponible),
    ['0.000', '6.000', '4.000'],
  );
  await assert.rejects(
    operaciones.trasladar(
      {
        ...body,
        idempotencia: id(41),
        detalles: [{ productoId: id(4), bodegaDestinoId: id(6), cantidad: 1 }],
      },
      id(1),
    ),
    (e) => e.status === 422,
  );
});
test('conteo obsoleto y rollback cuando falla la entrada destino', async (t) => {
  const pg = await entorno(t);
  const op = await operaciones.guardarConteo(
    { bodegaId: id(6), nota: 'Conteo', detalles: [{ productoId: id(4), cantidadContada: 9 }] },
    id(1),
  );
  await pg.exec(`UPDATE detalle_movimiento SET cantidad=11 WHERE id='${id(11)}'`);
  await assert.rejects(operaciones.aplicarConteo(op.id, null, id(1)), (e) => e.status === 409);
  await pg.exec(`CREATE FUNCTION fallar_destino() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.bodega_id='${id(7)}' THEN RAISE EXCEPTION 'fallo simulado'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER test_fallar BEFORE INSERT ON movimientos_inventario FOR EACH ROW EXECUTE FUNCTION fallar_destino();`);
  await assert.rejects(
    operaciones.trasladar(
      {
        bodegaId: id(6),
        idempotencia: id(42),
        detalles: [{ productoId: id(4), bodegaDestinoId: id(7), cantidad: 3 }],
      },
      id(1),
    ),
  );
  assert.equal(
    (await pg.query('SELECT COUNT(*)::int AS n FROM movimientos_inventario')).rows[0].n,
    1,
  );
  assert.equal(
    (await consultas.existencias({ bodegaId: id(6), productoId: id(4) })).filas[0]
      .inventarioDisponible,
    '11.000',
  );
});
test('lotes, cantidades decimales, producto obligatorio y kardex sin movimientos en rango', async (t) => {
  const pg = await entorno(t);
  assert.throws(() => operaciones.miles(-1));
  assert.throws(() => operaciones.miles('1.2345'));
  assert.equal(
    operaciones.decimal(operaciones.miles('0.100') + operaciones.miles('0.200')),
    '0.300',
  );
  await assert.rejects(
    consultas.kardex({ fechaDesde: '2021-01-01', fechaHasta: '2021-01-30' }),
    (e) => e.status === 422,
  );
  const kardex = await consultas.kardex({
    productoId: id(4),
    bodegaId: id(6),
    fechaDesde: '2021-01-01',
    fechaHasta: '2021-01-30',
  });
  assert.equal(kardex.total, 0);
  assert.equal(kardex.saldos[0].saldoInicial, '10.000');
  assert.equal(kardex.saldos[0].saldoFinal, '10.000');
  await pg.exec(`UPDATE categorias_productos SET requiere_lote=true WHERE id='${id(2)}'`);
  await assert.rejects(
    operaciones.guardarConteo(
      { bodegaId: id(6), detalles: [{ productoId: id(4), cantidadContada: 5 }] },
      id(1),
    ),
    (e) => e.status === 422,
  );
  await pg.exec(`UPDATE detalle_movimiento SET lote='LOTE-A' WHERE id='${id(11)}'`);
  await assert.rejects(
    operaciones.trasladar(
      {
        bodegaId: id(6),
        idempotencia: id(42),
        detalles: [{ productoId: id(4), lote: 'LOTE-B', bodegaDestinoId: id(7), cantidad: 3 }],
      },
      id(1),
    ),
    (e) => e.status === 409,
  );
  const trasladado = await operaciones.trasladar(
    {
      bodegaId: id(6),
      idempotencia: id(43),
      detalles: [{ productoId: id(4), lote: 'LOTE-A', bodegaDestinoId: id(7), cantidad: '0.300' }],
    },
    id(1),
  );
  assert.equal(trasladado.documentos.length, 2);
  assert.equal(
    (await consultas.existencias({ bodegaId: id(7), productoId: id(4) })).filas[0]
      .inventarioDisponible,
    '0.300',
  );
});

test('conteo sin diferencia, bodegas inactivas e historia desconocida', async (t) => {
  const pg = await entorno(t);
  const conteo = await operaciones.guardarConteo({ bodegaId: id(6), nota: 'Sin diferencia', detalles: [{ productoId: id(4), cantidadContada: 10 }] }, id(1));
  assert.equal((await operaciones.aplicarConteo(conteo.id, null, id(1))).documentos.length, 0);
  await pg.exec(`UPDATE bodegas SET estado=false WHERE id='${id(7)}'`);
  await assert.rejects(operaciones.trasladar({ bodegaId: id(6), idempotencia: id(50), detalles: [{ productoId: id(4), bodegaDestinoId: id(7), cantidad: 1 }] }, id(1)), e => e.status === 422);
  await pg.exec(`UPDATE movimientos_inventario SET tipo_documento='AJ' WHERE id='${id(10)}'`);
  await assert.rejects(operaciones.guardarConteo({ bodegaId: id(6), detalles: [{ productoId: id(4), cantidadContada: 10 }] }, id(1)), e => e.status === 409);
  const k = await consultas.kardex({ productoId: id(4), fechaDesde: '2021-01-01', fechaHasta: '2099-01-01' });
  assert.equal(k.saldos[0].saldoInicial, null);
  assert.equal(k.saldos[0].saldoFinal, null);
});

test('kardex paginado conserva saldo y exporta cantidades como números', async (t) => {
  await entorno(t);
  await operaciones.trasladar({ bodegaId: id(6), idempotencia: id(51), detalles: [{ productoId: id(4), bodegaDestinoId: id(7), cantidad: 3 }] }, id(1));
  const k = await consultas.kardex({ productoId: id(4), bodegaId: id(6), fechaDesde: '2020-01-01', fechaHasta: '2099-01-01', pagina: 2, limite: 1 });
  assert.equal(k.total, 2); assert.equal(k.filas.length, 1); assert.equal(k.filas[0].saldo, '7.000');
  const { exportar } = require('../services/inventario/exportar.service');
  let buffer;
  const res = { type() {}, attachment() {}, send(value) { buffer = value; } };
  await exportar(res, k, 'xlsx', 'kardex');
  const workbook = new (require('exceljs').Workbook)(); await workbook.xlsx.load(buffer);
  assert.equal(workbook.getWorksheet('Informe').getCell('I2').value, 7);
  await exportar(res, k, 'pdf', 'kardex');
  assert.equal(buffer.subarray(0,5).toString(), '%PDF-');
});
