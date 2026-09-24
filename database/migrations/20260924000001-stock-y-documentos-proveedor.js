'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('configuraciones_stock', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true, allowNull: false },
        producto_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'productos', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
        bodega_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'bodegas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
        stock_minimo: { type: Sequelize.DECIMAL(15, 3), allowNull: false },
        punto_reorden: { type: Sequelize.DECIMAL(15, 3), allowNull: false },
        stock_maximo: { type: Sequelize.DECIMAL(15, 3), allowNull: true },
        activo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        usuario_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'usuarios', key: 'id' }, onDelete: 'SET NULL' },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      }, { transaction });
      await queryInterface.addConstraint('configuraciones_stock', { fields: ['producto_id', 'bodega_id'], type: 'unique', name: 'configuraciones_stock_producto_bodega_unique', transaction });
      await queryInterface.sequelize.query('ALTER TABLE configuraciones_stock ADD CONSTRAINT configuraciones_stock_orden_check CHECK (stock_minimo >= 0 AND punto_reorden >= stock_minimo AND (stock_maximo IS NULL OR stock_maximo >= punto_reorden))', { transaction });
      await queryInterface.addIndex('configuraciones_stock', ['bodega_id', 'activo'], { transaction });
      await queryInterface.changeColumn('proveedores', 'razon_social', { type: Sequelize.STRING(200), allowNull: true }, { transaction });
      await queryInterface.addColumn('proveedores', 'nombre_contacto_telefono', { type: Sequelize.STRING(150), allowNull: true }, { transaction });
      await queryInterface.createTable('documentos_proveedor', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true, allowNull: false },
        proveedor_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'proveedores', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        tipo: { type: Sequelize.STRING(20), allowNull: false },
        nombre_original: { type: Sequelize.STRING(255), allowNull: false },
        clave: { type: Sequelize.STRING(255), allowNull: false, unique: true },
        mime_type: { type: Sequelize.STRING(100), allowNull: false },
        tamano: { type: Sequelize.INTEGER, allowNull: false },
        fecha_carga: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      }, { transaction });
      await queryInterface.addConstraint('documentos_proveedor', { fields: ['proveedor_id', 'tipo'], type: 'unique', name: 'documentos_proveedor_tipo_unique', transaction });
      await queryInterface.sequelize.query("ALTER TABLE documentos_proveedor ADD CONSTRAINT documentos_proveedor_tipo_check CHECK (tipo IN ('CAMARA_COMERCIO','RUT'))", { transaction });
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable('documentos_proveedor', { transaction });
      await queryInterface.removeColumn('proveedores', 'nombre_contacto_telefono', { transaction });
      await queryInterface.sequelize.query("UPDATE proveedores SET razon_social=COALESCE(NULLIF(nombre_comercial,''),numero_documento) WHERE razon_social IS NULL", { transaction });
      await queryInterface.changeColumn('proveedores', 'razon_social', { type: Sequelize.STRING(200), allowNull: false }, { transaction });
      await queryInterface.dropTable('configuraciones_stock', { transaction });
    });
  },
};
