const PERMISOS = ['ver', 'crear', 'editar', 'confirmar', 'cancelar'];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        'CREATE SEQUENCE pedidos_venta_numero_seq START WITH 1 INCREMENT BY 1',
        { transaction },
      );

      await queryInterface.createTable(
        'pedidos_venta',
        {
          id: {
            type: Sequelize.UUID,
            primaryKey: true,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
          },
          numero: { type: Sequelize.STRING(20), allowNull: false, unique: true },
          fecha: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
          cliente_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: 'proveedores', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          usuario_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: 'usuarios', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          estado: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'BORRADOR' },
          observaciones: { type: Sequelize.TEXT, allowNull: true },
          fecha_cancelacion: { type: Sequelize.DATE, allowNull: true },
          usuario_cancelacion_id: {
            type: Sequelize.UUID,
            allowNull: true,
            references: { model: 'usuarios', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          motivo_cancelacion: { type: Sequelize.TEXT, allowNull: true },
          created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
          updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
        },
        { transaction },
      );

      await queryInterface.createTable(
        'pedido_venta_detalle',
        {
          id: {
            type: Sequelize.UUID,
            primaryKey: true,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
          },
          pedido_venta_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: 'pedidos_venta', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          producto_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: 'productos', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          cantidad: { type: Sequelize.DECIMAL(18, 3), allowNull: false },
          unidad_medida_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: 'unidades_medida', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
          updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
        },
        { transaction },
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE pedidos_venta ADD CONSTRAINT pedidos_venta_estado_check
         CHECK (estado IN ('BORRADOR', 'CONFIRMADO', 'CANCELADO'))`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        'ALTER TABLE pedido_venta_detalle ADD CONSTRAINT pedido_venta_cantidad_check CHECK (cantidad > 0)',
        { transaction },
      );
      await queryInterface.addIndex('pedido_venta_detalle', ['pedido_venta_id', 'producto_id'], {
        unique: true,
        name: 'pedido_venta_producto_unique',
        transaction,
      });
      await queryInterface.addIndex('pedidos_venta', ['cliente_id', 'fecha'], { transaction });
      await queryInterface.addIndex('pedidos_venta', ['estado', 'fecha'], { transaction });

      for (const accion of PERMISOS) {
        await queryInterface.sequelize.query(
          `INSERT INTO permissions
             (id, nombre, descripcion, modulo, estado, "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), :nombre, :descripcion, 'Ventas', true, NOW(), NOW())
           ON CONFLICT (nombre) DO NOTHING`,
          {
            replacements: {
              nombre: `ventas.pedidos.${accion}`,
              descripcion: `${accion} pedidos de venta`,
            },
            transaction,
          },
        );
      }
      await queryInterface.sequelize.query(
        `INSERT INTO role_permissions (rol_id, permiso_id)
         SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
         WHERE r.nombre = 'Administrador' AND p.nombre IN (:permisos)
           AND NOT EXISTS (
             SELECT 1 FROM role_permissions rp
             WHERE rp.rol_id = r.id AND rp.permiso_id = p.id
           )`,
        {
          replacements: { permisos: PERMISOS.map((accion) => `ventas.pedidos.${accion}`) },
          transaction,
        },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable('pedido_venta_detalle', { transaction });
      await queryInterface.dropTable('pedidos_venta', { transaction });
      await queryInterface.sequelize.query('DROP SEQUENCE pedidos_venta_numero_seq', {
        transaction,
      });
      await queryInterface.sequelize.query(
        `DELETE FROM role_permissions WHERE permiso_id IN
         (SELECT id FROM permissions WHERE nombre IN (:permisos))`,
        {
          replacements: { permisos: PERMISOS.map((accion) => `ventas.pedidos.${accion}`) },
          transaction,
        },
      );
      await queryInterface.sequelize.query('DELETE FROM permissions WHERE nombre IN (:permisos)', {
        replacements: { permisos: PERMISOS.map((accion) => `ventas.pedidos.${accion}`) },
        transaction,
      });
    });
  },
};
