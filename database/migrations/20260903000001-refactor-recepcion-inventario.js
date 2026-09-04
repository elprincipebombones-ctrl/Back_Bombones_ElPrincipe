'use strict';

const existeTabla = async (sequelize, tabla, transaction) => {
  const [filas] = await sequelize.query(
    `SELECT to_regclass('public.${tabla}') IS NOT NULL AS existe`,
    { transaction },
  );
  return filas[0].existe;
};

const existeRestriccion = async (sequelize, nombre, transaction) => {
  const [filas] = await sequelize.query(
    `SELECT EXISTS (SELECT 1 FROM pg_constraint
      WHERE connamespace = 'public'::regnamespace AND conname = :nombre) AS existe`,
    { replacements: { nombre }, transaction },
  );
  return filas[0].existe;
};

const agregarColumna = async (queryInterface, tabla, columna, definicion, transaction) => {
  const columnas = await queryInterface.describeTable(tabla, { transaction });
  if (!columnas[columna]) {
    await queryInterface.addColumn(tabla, columna, definicion, { transaction });
  }
};

module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      // Los registros operativos existentes pertenecen a pruebas. Se eliminan
      // sin tocar los maestros de productos, categorías, proveedores o bodegas.
      const tablasOperativas = [
        'detalle_movimiento',
        'detalles_movimiento_inventario',
        'movimientos_inventario',
        'detalles_recepcion',
        'recepciones_vehiculos',
        'temperaturas_recepcion',
        'verificaciones_recepcion',
        'condiciones_ambientales_recepcion',
        'resultados_recepcion',
        'verificaciones_limpieza_recepcion',
        'recepciones',
      ];
      for (const tabla of tablasOperativas) {
        if (await existeTabla(sequelize, tabla, transaction)) {
          await sequelize.query(`DELETE FROM ${tabla}`, { transaction });
        }
      }

      await agregarColumna(
        queryInterface,
        'categorias_productos',
        'clasificacion_mp',
        {
          type: Sequelize.STRING(30),
          allowNull: true,
        },
        transaction,
      );
      await sequelize.query(
        `UPDATE categorias_productos SET clasificacion_mp = 'NO_PERECEDERA'
         WHERE clasificacion_mp IS NULL
            OR clasificacion_mp NOT IN ('PERECEDERA', 'NO_PERECEDERA')`,
        { transaction },
      );
      await queryInterface.changeColumn(
        'categorias_productos',
        'clasificacion_mp',
        {
          type: Sequelize.STRING(30),
          allowNull: false,
        },
        { transaction },
      );
      if (
        !(await existeRestriccion(
          sequelize,
          'categorias_productos_clasificacion_mp_check',
          transaction,
        ))
      ) {
        await sequelize.query(
          `ALTER TABLE categorias_productos
           ADD CONSTRAINT categorias_productos_clasificacion_mp_check
           CHECK (clasificacion_mp IN ('PERECEDERA', 'NO_PERECEDERA'))`,
          { transaction },
        );
      }

      await sequelize.query(
        `UPDATE recepciones SET estado = 'EN_PROCESO'
         WHERE estado IS NULL OR estado NOT IN ('EN_PROCESO', 'TERMINADA')`,
        { transaction },
      );
      await queryInterface.changeColumn(
        'recepciones',
        'estado',
        {
          type: Sequelize.STRING(30),
          allowNull: false,
          defaultValue: 'EN_PROCESO',
        },
        { transaction },
      );
      if (!(await existeRestriccion(sequelize, 'recepciones_estado_check', transaction))) {
        await sequelize.query(
          `ALTER TABLE recepciones ADD CONSTRAINT recepciones_estado_check
           CHECK (estado IN ('EN_PROCESO', 'TERMINADA'))`,
          { transaction },
        );
      }

      await agregarColumna(
        queryInterface,
        'detalles_recepcion',
        'cantidad_solicitada',
        {
          type: Sequelize.DECIMAL(15, 3),
          allowNull: true,
        },
        transaction,
      );
      let detalles = await queryInterface.describeTable('detalles_recepcion', { transaction });
      if (!detalles.cantidad_recibida) {
        await queryInterface.addColumn(
          'detalles_recepcion',
          'cantidad_recibida',
          {
            type: Sequelize.DECIMAL(15, 3),
            allowNull: true,
          },
          { transaction },
        );
        if (detalles.cantidad) {
          await sequelize.query(
            `UPDATE detalles_recepcion SET cantidad_recibida = cantidad
             WHERE cantidad_recibida IS NULL`,
            { transaction },
          );
        }
      }
      await agregarColumna(
        queryInterface,
        'detalles_recepcion',
        'lote_proveedor',
        {
          type: Sequelize.STRING(100),
          allowNull: true,
        },
        transaction,
      );
      detalles = await queryInterface.describeTable('detalles_recepcion', { transaction });
      if (detalles.lote) {
        await sequelize.query(
          `UPDATE detalles_recepcion SET lote_proveedor = COALESCE(lote_proveedor, lote)
           WHERE lote IS NOT NULL`,
          { transaction },
        );
      }
      const recepciones = await queryInterface.describeTable('recepciones', { transaction });
      if (recepciones.lote) {
        await sequelize.query(
          `UPDATE detalles_recepcion d SET lote_proveedor = r.lote
           FROM recepciones r
           WHERE d.recepcion_id = r.id AND d.lote_proveedor IS NULL`,
          { transaction },
        );
      }
      const [sinCantidad] = await sequelize.query(
        `SELECT COUNT(*)::int AS total FROM detalles_recepcion WHERE cantidad_recibida IS NULL`,
        { transaction },
      );
      if (sinCantidad[0].total > 0) {
        throw new Error(
          'Hay detalles históricos sin cantidad; no es seguro completar la migración',
        );
      }
      await queryInterface.changeColumn(
        'detalles_recepcion',
        'cantidad_recibida',
        {
          type: Sequelize.DECIMAL(15, 3),
          allowNull: false,
        },
        { transaction },
      );
      await queryInterface.changeColumn(
        'detalles_recepcion',
        'lote_proveedor',
        {
          type: Sequelize.STRING(100),
          allowNull: true,
        },
        { transaction },
      );
      if (
        !(await existeRestriccion(
          sequelize,
          'detalles_recepcion_cantidad_recibida_check',
          transaction,
        ))
      ) {
        await sequelize.query(
          `ALTER TABLE detalles_recepcion
           ADD CONSTRAINT detalles_recepcion_cantidad_recibida_check CHECK (cantidad_recibida > 0)`,
          { transaction },
        );
      }
      if (detalles.lote)
        await queryInterface.removeColumn('detalles_recepcion', 'lote', { transaction });
      if (detalles.cantidad)
        await queryInterface.removeColumn('detalles_recepcion', 'cantidad', { transaction });

      await agregarColumna(
        queryInterface,
        'temperaturas_recepcion',
        'condicion_termica',
        {
          type: Sequelize.STRING(20),
          allowNull: true,
        },
        transaction,
      );
      await sequelize.query(
        `UPDATE temperaturas_recepcion SET condicion_termica = 'REFRIGERADO'
         WHERE condicion_termica IS NULL
            OR condicion_termica NOT IN ('REFRIGERADO', 'CONGELADO')`,
        { transaction },
      );
      await queryInterface.changeColumn(
        'temperaturas_recepcion',
        'condicion_termica',
        {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: 'REFRIGERADO',
        },
        { transaction },
      );
      if (
        !(await existeRestriccion(
          sequelize,
          'temperaturas_recepcion_condicion_termica_check',
          transaction,
        ))
      ) {
        await sequelize.query(
          `ALTER TABLE temperaturas_recepcion
           ADD CONSTRAINT temperaturas_recepcion_condicion_termica_check
           CHECK (condicion_termica IN ('REFRIGERADO', 'CONGELADO'))`,
          { transaction },
        );
      }

      if (!(await existeTabla(sequelize, 'movimientos_inventario', transaction))) {
        await queryInterface.createTable(
          'movimientos_inventario',
          {
            id: {
              type: Sequelize.UUID,
              defaultValue: Sequelize.literal('gen_random_uuid()'),
              primaryKey: true,
              allowNull: false,
            },
            tipo_documento: { type: Sequelize.STRING(2), allowNull: false },
            numero_documento: { type: Sequelize.STRING(50), allowNull: false, unique: true },
            fecha: { type: Sequelize.DATE, allowNull: false },
            bodega_id: {
              type: Sequelize.UUID,
              allowNull: false,
              references: { model: 'bodegas', key: 'id' },
              onUpdate: 'CASCADE',
              onDelete: 'RESTRICT',
            },
            estado: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'APLICADO' },
            origen: { type: Sequelize.STRING(30), allowNull: false },
            origen_id: { type: Sequelize.UUID, allowNull: false },
            usuario_id: {
              type: Sequelize.UUID,
              allowNull: false,
              references: { model: 'usuarios', key: 'id' },
              onUpdate: 'CASCADE',
              onDelete: 'RESTRICT',
            },
            observaciones: { type: Sequelize.TEXT, allowNull: true },
            created_at: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.fn('NOW'),
            },
            updated_at: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.fn('NOW'),
            },
          },
          { transaction },
        );
      } else {
        const columnasMovimiento = [
          ['tipo_documento', { type: Sequelize.STRING(2), allowNull: true }],
          ['numero_documento', { type: Sequelize.STRING(50), allowNull: true }],
          ['fecha', { type: Sequelize.DATE, allowNull: true }],
          ['estado', { type: Sequelize.STRING(30), allowNull: true }],
          ['origen', { type: Sequelize.STRING(30), allowNull: true }],
          ['origen_id', { type: Sequelize.UUID, allowNull: true }],
        ];
        for (const [columna, definicion] of columnasMovimiento) {
          await agregarColumna(
            queryInterface,
            'movimientos_inventario',
            columna,
            definicion,
            transaction,
          );
        }
      }

      let movimientos = await queryInterface.describeTable('movimientos_inventario', {
        transaction,
      });
      if (movimientos.tipo_movimiento) {
        await sequelize.query(
          `UPDATE movimientos_inventario SET tipo_documento = CASE
             WHEN tipo_movimiento IN ('EN', 'SA', 'AJ', 'TR') THEN tipo_movimiento ELSE 'AJ' END
           WHERE tipo_documento IS NULL`,
          { transaction },
        );
      }
      if (movimientos.fecha_movimiento) {
        await sequelize.query(
          `UPDATE movimientos_inventario SET fecha = fecha_movimiento WHERE fecha IS NULL`,
          { transaction },
        );
      }
      if (movimientos.recepcion_id) {
        await sequelize.query(
          `UPDATE movimientos_inventario
           SET origen = CASE WHEN recepcion_id IS NULL THEN 'LEGACY' ELSE 'RECEPCION' END,
               origen_id = COALESCE(recepcion_id, id)
           WHERE origen IS NULL OR origen_id IS NULL`,
          { transaction },
        );
      } else {
        await sequelize.query(
          `UPDATE movimientos_inventario
           SET origen = COALESCE(origen, 'LEGACY'), origen_id = COALESCE(origen_id, id)
           WHERE origen IS NULL OR origen_id IS NULL`,
          { transaction },
        );
      }
      await sequelize.query(
        `UPDATE movimientos_inventario
         SET numero_documento = tipo_documento || '-LEG-' || LEFT(id::text, 8)
         WHERE numero_documento IS NULL`,
        { transaction },
      );
      await sequelize.query(
        `UPDATE movimientos_inventario SET fecha = COALESCE(fecha, created_at, NOW()),
           estado = COALESCE(estado, 'APLICADO')`,
        { transaction },
      );
      if (movimientos.recepcion_id) {
        await sequelize.query(
          `UPDATE movimientos_inventario m SET usuario_id = r.usuario_recepcion_id
           FROM recepciones r
           WHERE m.recepcion_id = r.id AND m.usuario_id IS NULL`,
          { transaction },
        );
      }
      const [movimientosInvalidos] = await sequelize.query(
        `SELECT COUNT(*)::int AS total FROM movimientos_inventario
         WHERE tipo_documento IS NULL OR numero_documento IS NULL OR fecha IS NULL
            OR estado IS NULL OR origen IS NULL OR origen_id IS NULL
            OR bodega_id IS NULL OR usuario_id IS NULL`,
        { transaction },
      );
      if (movimientosInvalidos[0].total > 0) {
        throw new Error(
          'Hay movimientos históricos incompletos; no es seguro completar la migración',
        );
      }
      for (const [columna, definicion] of [
        ['tipo_documento', { type: Sequelize.STRING(2), allowNull: false }],
        ['numero_documento', { type: Sequelize.STRING(50), allowNull: false }],
        ['fecha', { type: Sequelize.DATE, allowNull: false }],
        ['estado', { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'APLICADO' }],
        ['origen', { type: Sequelize.STRING(30), allowNull: false }],
        ['origen_id', { type: Sequelize.UUID, allowNull: false }],
        ['usuario_id', { type: Sequelize.UUID, allowNull: false }],
      ]) {
        await queryInterface.changeColumn('movimientos_inventario', columna, definicion, {
          transaction,
        });
      }

      if (!(await existeTabla(sequelize, 'detalle_movimiento', transaction))) {
        await queryInterface.createTable(
          'detalle_movimiento',
          {
            id: {
              type: Sequelize.UUID,
              defaultValue: Sequelize.literal('gen_random_uuid()'),
              primaryKey: true,
              allowNull: false,
            },
            movimiento_inventario_id: { type: Sequelize.UUID, allowNull: false },
            producto_id: { type: Sequelize.UUID, allowNull: false },
            unidad_medida_id: { type: Sequelize.UUID, allowNull: false },
            cantidad: { type: Sequelize.DECIMAL(15, 3), allowNull: false },
            lote: { type: Sequelize.STRING(100), allowNull: true },
            lote_proveedor: { type: Sequelize.STRING(100), allowNull: true },
            fecha_vencimiento: { type: Sequelize.DATEONLY, allowNull: true },
            costo_unitario: { type: Sequelize.DECIMAL(18, 6), allowNull: true },
            costo_total: { type: Sequelize.DECIMAL(18, 2), allowNull: true },
            observaciones: { type: Sequelize.TEXT, allowNull: true },
            created_at: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.fn('NOW'),
            },
            updated_at: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.fn('NOW'),
            },
          },
          { transaction },
        );
      }
      if (await existeTabla(sequelize, 'detalles_movimiento_inventario', transaction)) {
        await sequelize.query(
          `INSERT INTO detalle_movimiento (
             id, movimiento_inventario_id, producto_id, unidad_medida_id, cantidad,
             lote, lote_proveedor, fecha_vencimiento, created_at, updated_at)
           SELECT d.id, d.movimiento_inventario_id, d.producto_id, d.unidad_medida_id,
                  d.cantidad, d.lote_proveedor, d.lote_proveedor, d.fecha_vencimiento,
                  d.created_at, d.updated_at
           FROM detalles_movimiento_inventario d
           WHERE NOT EXISTS (SELECT 1 FROM detalle_movimiento n
             WHERE n.id = d.id OR (n.movimiento_inventario_id = d.movimiento_inventario_id
               AND n.producto_id = d.producto_id
               AND n.unidad_medida_id = d.unidad_medida_id
               AND n.cantidad = d.cantidad
               AND n.lote_proveedor IS NOT DISTINCT FROM d.lote_proveedor))`,
          { transaction },
        );
        await queryInterface.dropTable('detalles_movimiento_inventario', { transaction });
      }

      if (await existeTabla(sequelize, 'verificaciones_limpieza_recepcion', transaction)) {
        const notasSql = `SELECT recepcion_id, string_agg(format(
          'Limpieza histórica: plataforma=%s, termómetro=%s, pistola=%s, presión=%s',
          COALESCE(plataforma_ok::text, 'sin dato'), COALESCE(termometro_ok::text, 'sin dato'),
          COALESCE(pistola_aspersion_ok::text, 'sin dato'), COALESCE(presion, 'sin dato')
        ), E'\\n' ORDER BY created_at) AS nota
        FROM verificaciones_limpieza_recepcion GROUP BY recepcion_id`;
        await sequelize.query(
          `WITH notas AS (${notasSql}) UPDATE condiciones_ambientales_recepcion c
           SET observaciones = concat_ws(E'\\n', NULLIF(c.observaciones, ''), notas.nota),
               updated_at = NOW() FROM notas WHERE c.recepcion_id = notas.recepcion_id`,
          { transaction },
        );
        await sequelize.query(
          `WITH notas AS (${notasSql}) INSERT INTO condiciones_ambientales_recepcion
             (id, recepcion_id, observaciones, created_at, updated_at)
           SELECT gen_random_uuid(), notas.recepcion_id, notas.nota, NOW(), NOW() FROM notas
           WHERE NOT EXISTS (SELECT 1 FROM condiciones_ambientales_recepcion c
             WHERE c.recepcion_id = notas.recepcion_id)`,
          { transaction },
        );
        await queryInterface.dropTable('verificaciones_limpieza_recepcion', { transaction });
      }

      movimientos = await queryInterface.describeTable('movimientos_inventario', { transaction });
      for (const columna of ['tipo_movimiento', 'fecha_movimiento', 'recepcion_id']) {
        if (movimientos[columna]) {
          await queryInterface.removeColumn('movimientos_inventario', columna, { transaction });
        }
      }
      const columnasRecepcion = await queryInterface.describeTable('recepciones', { transaction });
      for (const columna of ['tipo_recepcion', 'lote']) {
        if (columnasRecepcion[columna]) {
          await queryInterface.removeColumn('recepciones', columna, { transaction });
        }
      }

      const restricciones = [
        [
          'movimientos_inventario_tipo_documento_check',
          `ALTER TABLE movimientos_inventario ADD CONSTRAINT movimientos_inventario_tipo_documento_check CHECK (tipo_documento IN ('EN', 'SA', 'AJ', 'TR'))`,
        ],
        [
          'movimientos_inventario_estado_check',
          `ALTER TABLE movimientos_inventario ADD CONSTRAINT movimientos_inventario_estado_check CHECK (estado IN ('APLICADO', 'ANULADO'))`,
        ],
        [
          'movimientos_inventario_numero_documento_unique',
          `ALTER TABLE movimientos_inventario ADD CONSTRAINT movimientos_inventario_numero_documento_unique UNIQUE (numero_documento)`,
        ],
        [
          'movimientos_inventario_origen_unique',
          `ALTER TABLE movimientos_inventario ADD CONSTRAINT movimientos_inventario_origen_unique UNIQUE (origen, origen_id)`,
        ],
        [
          'detalle_movimiento_cantidad_check',
          `ALTER TABLE detalle_movimiento ADD CONSTRAINT detalle_movimiento_cantidad_check CHECK (cantidad > 0)`,
        ],
        [
          'detalle_movimiento_movimiento_fkey',
          `ALTER TABLE detalle_movimiento ADD CONSTRAINT detalle_movimiento_movimiento_fkey FOREIGN KEY (movimiento_inventario_id) REFERENCES movimientos_inventario(id) ON UPDATE CASCADE ON DELETE CASCADE`,
        ],
        [
          'detalle_movimiento_producto_fkey',
          `ALTER TABLE detalle_movimiento ADD CONSTRAINT detalle_movimiento_producto_fkey FOREIGN KEY (producto_id) REFERENCES productos(id) ON UPDATE CASCADE ON DELETE RESTRICT`,
        ],
        [
          'detalle_movimiento_unidad_fkey',
          `ALTER TABLE detalle_movimiento ADD CONSTRAINT detalle_movimiento_unidad_fkey FOREIGN KEY (unidad_medida_id) REFERENCES unidades_medida(id) ON UPDATE CASCADE ON DELETE RESTRICT`,
        ],
      ];
      if (
        await existeRestriccion(sequelize, 'movimientos_inventario_usuario_id_fkey', transaction)
      ) {
        await sequelize.query(
          'ALTER TABLE movimientos_inventario DROP CONSTRAINT movimientos_inventario_usuario_id_fkey',
          { transaction },
        );
      }
      restricciones.push([
        'movimientos_inventario_usuario_fkey',
        'ALTER TABLE movimientos_inventario ADD CONSTRAINT movimientos_inventario_usuario_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT',
      ]);
      for (const [nombre, sql] of restricciones) {
        if (!(await existeRestriccion(sequelize, nombre, transaction))) {
          await sequelize.query(sql, { transaction });
        }
      }

      await sequelize.query(
        `CREATE INDEX IF NOT EXISTS movimientos_inventario_tipo_documento_idx ON movimientos_inventario(tipo_documento);
         CREATE INDEX IF NOT EXISTS movimientos_inventario_fecha_idx ON movimientos_inventario(fecha);
         CREATE INDEX IF NOT EXISTS movimientos_inventario_bodega_idx ON movimientos_inventario(bodega_id);
         CREATE INDEX IF NOT EXISTS movimientos_inventario_origen_idx ON movimientos_inventario(origen, origen_id);
         CREATE INDEX IF NOT EXISTS detalle_movimiento_producto_idx ON detalle_movimiento(producto_id);
         CREATE INDEX IF NOT EXISTS detalle_movimiento_movimiento_idx ON detalle_movimiento(movimiento_inventario_id);
         CREATE INDEX IF NOT EXISTS detalle_movimiento_fefo_idx ON detalle_movimiento(producto_id, fecha_vencimiento);
         CREATE INDEX IF NOT EXISTS detalle_movimiento_lote_idx ON detalle_movimiento(lote);
         CREATE INDEX IF NOT EXISTS detalle_movimiento_lote_proveedor_idx ON detalle_movimiento(lote_proveedor);
         CREATE INDEX IF NOT EXISTS detalle_movimiento_costo_idx ON detalle_movimiento(producto_id, costo_unitario);`,
        { transaction },
      );

      await sequelize.query('CREATE SEQUENCE IF NOT EXISTS recepciones_numero_seq', {
        transaction,
      });
      await sequelize.query('CREATE SEQUENCE IF NOT EXISTS movimientos_en_numero_seq', {
        transaction,
      });
      await sequelize.query(
        `SELECT setval('recepciones_numero_seq',
           COALESCE(MAX((regexp_match(numero, '([0-9]+)$'))[1]::BIGINT), 0) + 1, false)
         FROM recepciones`,
        { transaction },
      );
      await sequelize.query(
        `SELECT setval('movimientos_en_numero_seq',
           COALESCE(MAX((regexp_match(numero_documento, '^EN-([0-9]+)$'))[1]::BIGINT), 0) + 1, false)
         FROM movimientos_inventario WHERE tipo_documento = 'EN'`,
        { transaction },
      );
    });
  },

  async down() {
    throw new Error('Esta migración consolida datos históricos; no admite reversión automática.');
  },
};
