const { DataTypes } = require('sequelize');

const id = {
  type: DataTypes.UUID,
  defaultValue: DataTypes.UUIDV4,
  primaryKey: true,
};

const timestamps = {
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
};

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.sequelize.query(
        `CREATE SEQUENCE IF NOT EXISTS ordenes_produccion_numero_seq START WITH 1 INCREMENT BY 1`,
        { transaction },
      );

      await queryInterface.createTable(
        'ordenes_produccion',
        {
          id,
          numero: { type: DataTypes.STRING(20), allowNull: false, unique: true },
          fecha: { type: DataTypes.DATEONLY, allowNull: false },
          usuario_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'usuarios', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          estado: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'BORRADOR' },
          observaciones: { type: DataTypes.TEXT, allowNull: true },
          ...timestamps,
        },
        { transaction },
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE ordenes_produccion
         ADD CONSTRAINT ordenes_produccion_estado_check
         CHECK (estado IN ('BORRADOR', 'SIMULADA'))`,
        { transaction },
      );

      await queryInterface.createTable(
        'ordenes_produccion_detalle',
        {
          id,
          orden_produccion_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'ordenes_produccion', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          producto_terminado_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'productos', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          cantidad: { type: DataTypes.DECIMAL(18, 6), allowNull: false },
          ...timestamps,
        },
        { transaction },
      );
      await queryInterface.addConstraint('ordenes_produccion_detalle', {
        fields: ['orden_produccion_id', 'producto_terminado_id'],
        type: 'unique',
        name: 'ordenes_produccion_detalle_pt_unique',
        transaction,
      });
      await queryInterface.sequelize.query(
        `ALTER TABLE ordenes_produccion_detalle
         ADD CONSTRAINT ordenes_produccion_detalle_cantidad_check CHECK (cantidad > 0)`,
        { transaction },
      );

      await queryInterface.createTable(
        'ordenes_produccion_simulacion',
        {
          id,
          orden_produccion_id: {
            type: DataTypes.UUID,
            allowNull: false,
            unique: true,
            references: { model: 'ordenes_produccion', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          fecha_simulacion: { type: DataTypes.DATE, allowNull: false },
          ...timestamps,
        },
        { transaction },
      );

      await queryInterface.createTable(
        'ordenes_produccion_simulacion_detalle',
        {
          id,
          simulacion_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'ordenes_produccion_simulacion', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          producto_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: { model: 'productos', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          familia_mp_carnica_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: { model: 'familias_mp_carnicas', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          cantidad_requerida: { type: DataTypes.DECIMAL(18, 6), allowNull: false },
          cantidad_disponible: { type: DataTypes.DECIMAL(18, 6), allowNull: false },
          cantidad_faltante: { type: DataTypes.DECIMAL(18, 6), allowNull: false },
          unidad_medida_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'unidades_medida', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          estado: { type: DataTypes.STRING(20), allowNull: false },
          advertencias: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
          ...timestamps,
        },
        { transaction },
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE ordenes_produccion_simulacion_detalle
         ADD CONSTRAINT ordenes_produccion_simulacion_origen_check
           CHECK ((producto_id IS NOT NULL) <> (familia_mp_carnica_id IS NOT NULL)),
         ADD CONSTRAINT ordenes_produccion_simulacion_estado_check
           CHECK (estado IN ('OK', 'ADVERTENCIA', 'CRITICA')),
         ADD CONSTRAINT ordenes_produccion_simulacion_cantidades_check
           CHECK (cantidad_requerida > 0 AND cantidad_disponible >= 0 AND cantidad_faltante >= 0)`,
        { transaction },
      );

      await queryInterface.createTable(
        'ordenes_produccion_simulacion_lotes',
        {
          id,
          detalle_simulacion_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'ordenes_produccion_simulacion_detalle', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          producto_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'productos', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          lote: { type: DataTypes.STRING(100), allowNull: true },
          bodega_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'bodegas', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          fecha_vencimiento: { type: DataTypes.DATEONLY, allowNull: true },
          saldo_disponible: { type: DataTypes.DECIMAL(18, 6), allowNull: false },
          cantidad: { type: DataTypes.DECIMAL(18, 6), allowNull: false },
          es_sugerencia_fefo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
          seleccion_manual: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
          ...timestamps,
        },
        { transaction },
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE ordenes_produccion_simulacion_lotes
         ADD CONSTRAINT ordenes_produccion_simulacion_lote_cantidades_check
         CHECK (saldo_disponible > 0 AND cantidad > 0 AND cantidad <= saldo_disponible)`,
        { transaction },
      );

      await queryInterface.addIndex('ordenes_produccion', ['fecha'], { transaction });
      await queryInterface.addIndex('ordenes_produccion', ['estado'], { transaction });
      await queryInterface.addIndex('ordenes_produccion_simulacion_lotes', ['producto_id'], {
        transaction,
      });

      await queryInterface.sequelize.query(
        `INSERT INTO menus (id, nombre, ruta, icono, orden, estado, "createdAt", "updatedAt")
         SELECT gen_random_uuid(), 'Órdenes de producción', '/produccion/ordenes', 'assignment', 41,
                true, NOW(), NOW()
         WHERE NOT EXISTS (SELECT 1 FROM menus WHERE ruta = '/produccion/ordenes')`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `INSERT INTO role_menus (rol_id, menu_id)
         SELECT r.id, m.id
         FROM roles r
         CROSS JOIN menus m
         WHERE r.nombre = 'Administrador'
           AND m.ruta = '/produccion/ordenes'
           AND NOT EXISTS (
             SELECT 1 FROM role_menus rm
             WHERE rm.rol_id = r.id AND rm.menu_id = m.id
           )`,
        { transaction },
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
        `DELETE FROM role_menus
         WHERE menu_id IN (SELECT id FROM menus WHERE ruta = '/produccion/ordenes')`,
        { transaction },
      );
      await queryInterface.sequelize.query(`DELETE FROM menus WHERE ruta = '/produccion/ordenes'`, {
        transaction,
      });
      await queryInterface.dropTable('ordenes_produccion_simulacion_lotes', { transaction });
      await queryInterface.dropTable('ordenes_produccion_simulacion_detalle', { transaction });
      await queryInterface.dropTable('ordenes_produccion_simulacion', { transaction });
      await queryInterface.dropTable('ordenes_produccion_detalle', { transaction });
      await queryInterface.dropTable('ordenes_produccion', { transaction });
      await queryInterface.sequelize.query(
        'DROP SEQUENCE IF EXISTS ordenes_produccion_numero_seq',
        {
          transaction,
        },
      );
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
