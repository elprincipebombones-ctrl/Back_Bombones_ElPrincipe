const { DataTypes } = require('sequelize');

const PERMISOS = [
  ['produccion.cerrar', 'Cerrar una OT y generar la entrada de producto terminado'],
  [
    'produccion.cambiar_bodega_destino',
    'Cambiar la bodega de producto terminado durante el cierre',
  ],
];

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn(
        'bodegas',
        'es_bodega_pt_default',
        { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        { transaction },
      );
      await queryInterface.sequelize.query(
        `CREATE UNIQUE INDEX bodegas_pt_default_unique
         ON bodegas (es_bodega_pt_default)
         WHERE es_bodega_pt_default = true`,
        { transaction },
      );

      await queryInterface.addColumn(
        'resultados_produccion',
        'lote_pt',
        { type: DataTypes.STRING(30), allowNull: true, unique: true },
        { transaction },
      );
      await queryInterface.addColumn(
        'resultados_produccion',
        'fecha_vencimiento_sugerida',
        { type: DataTypes.DATEONLY, allowNull: true },
        { transaction },
      );
      await queryInterface.addColumn(
        'resultados_produccion',
        'fecha_vencimiento_final',
        { type: DataTypes.DATEONLY, allowNull: true },
        { transaction },
      );
      await queryInterface.addColumn(
        'resultados_produccion',
        'bodega_destino_id',
        {
          type: DataTypes.UUID,
          allowNull: true,
          references: { model: 'bodegas', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        { transaction },
      );

      await queryInterface.addColumn(
        'ordenes_produccion',
        'movimiento_entrada_id',
        {
          type: DataTypes.UUID,
          allowNull: true,
          unique: true,
          references: { model: 'movimientos_inventario', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        { transaction },
      );
      await queryInterface.addColumn(
        'ordenes_produccion',
        'fecha_finalizacion',
        { type: DataTypes.DATE, allowNull: true },
        { transaction },
      );
      await queryInterface.addColumn(
        'ordenes_produccion',
        'usuario_finalizacion_id',
        {
          type: DataTypes.UUID,
          allowNull: true,
          references: { model: 'usuarios', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        { transaction },
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE ordenes_produccion
         DROP CONSTRAINT IF EXISTS ordenes_produccion_estado_check`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE ordenes_produccion
         ADD CONSTRAINT ordenes_produccion_estado_check
         CHECK (estado IN ('BORRADOR', 'SIMULADA', 'EN_PRODUCCION', 'CANCELADA', 'FINALIZADA'))`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE movimientos_inventario
         DROP CONSTRAINT IF EXISTS movimientos_inventario_origen_unique`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE movimientos_inventario
         ADD CONSTRAINT movimientos_inventario_origen_tipo_unique
         UNIQUE (origen, origen_id, tipo_documento)`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `CREATE SEQUENCE IF NOT EXISTS lotes_pt_numero_seq START WITH 1 INCREMENT BY 1`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `SELECT setval(
           'lotes_pt_numero_seq',
           COALESCE((
             SELECT MAX(substring(lote_pt FROM '^LOTE-([0-9]+)$')::bigint)
             FROM resultados_produccion
             WHERE lote_pt ~ '^LOTE-[0-9]+$'
           ), 0) + 1,
           false
         )`,
        { transaction },
      );

      for (const [nombre, descripcion] of PERMISOS) {
        await queryInterface.sequelize.query(
          `INSERT INTO permissions
             (id, nombre, descripcion, modulo, estado, "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), :nombre, :descripcion, 'Producción', true, NOW(), NOW())
           ON CONFLICT (nombre) DO UPDATE SET
             descripcion = EXCLUDED.descripcion,
             modulo = EXCLUDED.modulo,
             estado = true,
             "updatedAt" = NOW()`,
          { replacements: { nombre, descripcion }, transaction },
        );
      }
      await queryInterface.sequelize.query(
        `INSERT INTO role_permissions (rol_id, permiso_id)
         SELECT r.id, p.id
         FROM roles r
         CROSS JOIN permissions p
         WHERE r.nombre = 'Administrador'
           AND p.nombre IN (:permisos)
           AND NOT EXISTS (
             SELECT 1 FROM role_permissions rp
             WHERE rp.rol_id = r.id AND rp.permiso_id = p.id
           )`,
        { replacements: { permisos: PERMISOS.map(([nombre]) => nombre) }, transaction },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query(
        `DELETE FROM role_permissions
         WHERE permiso_id IN (
           SELECT id FROM permissions WHERE nombre IN (:permisos)
         )`,
        { replacements: { permisos: PERMISOS.map(([nombre]) => nombre) }, transaction },
      );
      await queryInterface.sequelize.query(`DELETE FROM permissions WHERE nombre IN (:permisos)`, {
        replacements: { permisos: PERMISOS.map(([nombre]) => nombre) },
        transaction,
      });

      await queryInterface.sequelize.query(
        `ALTER TABLE movimientos_inventario
         DROP CONSTRAINT IF EXISTS movimientos_inventario_origen_tipo_unique`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE movimientos_inventario
         ADD CONSTRAINT movimientos_inventario_origen_unique UNIQUE (origen, origen_id)`,
        { transaction },
      );
      await queryInterface.sequelize.query('DROP SEQUENCE IF EXISTS lotes_pt_numero_seq', {
        transaction,
      });

      await queryInterface.removeColumn('ordenes_produccion', 'usuario_finalizacion_id', {
        transaction,
      });
      await queryInterface.removeColumn('ordenes_produccion', 'fecha_finalizacion', {
        transaction,
      });
      await queryInterface.removeColumn('ordenes_produccion', 'movimiento_entrada_id', {
        transaction,
      });
      await queryInterface.removeColumn('resultados_produccion', 'bodega_destino_id', {
        transaction,
      });
      await queryInterface.removeColumn('resultados_produccion', 'fecha_vencimiento_final', {
        transaction,
      });
      await queryInterface.removeColumn('resultados_produccion', 'fecha_vencimiento_sugerida', {
        transaction,
      });
      await queryInterface.removeColumn('resultados_produccion', 'lote_pt', { transaction });
      await queryInterface.removeIndex('bodegas', 'bodegas_pt_default_unique', { transaction });
      await queryInterface.removeColumn('bodegas', 'es_bodega_pt_default', { transaction });

      await queryInterface.sequelize.query(
        `ALTER TABLE ordenes_produccion
         DROP CONSTRAINT IF EXISTS ordenes_produccion_estado_check`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE ordenes_produccion
         ADD CONSTRAINT ordenes_produccion_estado_check
         CHECK (estado IN ('BORRADOR', 'SIMULADA', 'EN_PRODUCCION', 'CANCELADA'))`,
        { transaction },
      );
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
