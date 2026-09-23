const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.createTable(
        'formula_producto',
        {
          id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
          },
          producto_terminado_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'productos', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          activo: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
          updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
        },
        { transaction },
      );

      await queryInterface.sequelize.query(
        `CREATE UNIQUE INDEX formula_producto_pt_activa_unique
         ON formula_producto (producto_terminado_id)
         WHERE activo = true`,
        { transaction },
      );

      await queryInterface.createTable(
        'formula_componentes',
        {
          id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
          },
          formula_producto_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'formula_producto', key: 'id' },
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
          cantidad: {
            type: DataTypes.DECIMAL(15, 6),
            allowNull: false,
          },
          unidad_medida_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'unidades_medida', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          orden: {
            type: DataTypes.INTEGER,
            allowNull: false,
          },
          created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
          updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
        },
        { transaction },
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE formula_componentes
         ADD CONSTRAINT formula_componentes_origen_check
         CHECK ((producto_id IS NOT NULL) <> (familia_mp_carnica_id IS NOT NULL)),
         ADD CONSTRAINT formula_componentes_cantidad_check CHECK (cantidad > 0),
         ADD CONSTRAINT formula_componentes_orden_check CHECK (orden > 0)`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `CREATE UNIQUE INDEX formula_componentes_producto_unique
         ON formula_componentes (formula_producto_id, producto_id)
         WHERE producto_id IS NOT NULL`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `CREATE UNIQUE INDEX formula_componentes_familia_unique
         ON formula_componentes (formula_producto_id, familia_mp_carnica_id)
         WHERE familia_mp_carnica_id IS NOT NULL`,
        { transaction },
      );

      const permisos = [
        ['produccion.ver', 'Ver fórmulas de producción'],
        ['produccion.crear', 'Crear fórmulas de producción'],
        ['produccion.editar', 'Editar fórmulas de producción'],
      ];
      for (const [nombre, descripcion] of permisos) {
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
        `INSERT INTO menus (id, nombre, ruta, icono, orden, estado, "createdAt", "updatedAt")
         SELECT gen_random_uuid(), 'Fórmulas', '/produccion/formulas', 'science', 40, true, NOW(), NOW()
         WHERE NOT EXISTS (SELECT 1 FROM menus WHERE ruta = '/produccion/formulas')`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `INSERT INTO role_permissions (rol_id, permiso_id)
         SELECT r.id, p.id
         FROM roles r
         CROSS JOIN permissions p
         WHERE r.nombre = 'Administrador'
           AND p.nombre IN ('produccion.ver', 'produccion.crear', 'produccion.editar')
           AND NOT EXISTS (
             SELECT 1 FROM role_permissions rp
             WHERE rp.rol_id = r.id AND rp.permiso_id = p.id
           )`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `INSERT INTO role_menus (rol_id, menu_id)
         SELECT r.id, m.id
         FROM roles r
         CROSS JOIN menus m
         WHERE r.nombre = 'Administrador'
           AND m.ruta = '/produccion/formulas'
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
         WHERE menu_id IN (SELECT id FROM menus WHERE ruta = '/produccion/formulas')`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `DELETE FROM role_permissions
         WHERE permiso_id IN (
           SELECT id FROM permissions
           WHERE nombre IN ('produccion.ver', 'produccion.crear', 'produccion.editar')
         )`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `DELETE FROM menus WHERE ruta = '/produccion/formulas'`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `DELETE FROM permissions
         WHERE nombre IN ('produccion.ver', 'produccion.crear', 'produccion.editar')`,
        { transaction },
      );
      await queryInterface.dropTable('formula_componentes', { transaction });
      await queryInterface.dropTable('formula_producto', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
