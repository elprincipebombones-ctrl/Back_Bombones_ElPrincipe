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
      await queryInterface.createTable(
        'resultados_produccion',
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
          cantidad_planeada: { type: DataTypes.DECIMAL(18, 6), allowNull: false },
          cantidad_producida: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
          unidad_medida_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'unidades_medida', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          ...timestamps,
        },
        { transaction },
      );
      await queryInterface.addConstraint('resultados_produccion', {
        fields: ['orden_produccion_id', 'producto_terminado_id'],
        type: 'unique',
        name: 'resultados_produccion_orden_pt_unique',
        transaction,
      });
      await queryInterface.sequelize.query(
        `ALTER TABLE resultados_produccion
         ADD CONSTRAINT resultados_produccion_cantidades_check
         CHECK (cantidad_planeada >= 0 AND cantidad_producida >= 0)`,
        { transaction },
      );

      await queryInterface.createTable(
        'motivos_merma',
        {
          id,
          codigo: { type: DataTypes.STRING(40), allowNull: false, unique: true },
          nombre: { type: DataTypes.STRING(100), allowNull: false },
          activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
          ...timestamps,
        },
        { transaction },
      );

      await queryInterface.createTable(
        'mermas_produccion',
        {
          id,
          orden_produccion_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'ordenes_produccion', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          tipo_merma: { type: DataTypes.STRING(2), allowNull: false },
          producto_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'productos', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          cantidad: { type: DataTypes.DECIMAL(18, 6), allowNull: false },
          unidad_medida_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'unidades_medida', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          motivo_merma_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'motivos_merma', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          observacion: { type: DataTypes.TEXT, allowNull: true },
          usuario_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'usuarios', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
          ...timestamps,
        },
        { transaction },
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE mermas_produccion
         ADD CONSTRAINT mermas_produccion_tipo_check CHECK (tipo_merma IN ('MP', 'PT')),
         ADD CONSTRAINT mermas_produccion_cantidad_check CHECK (cantidad > 0)`,
        { transaction },
      );
      await queryInterface.addIndex('mermas_produccion', ['orden_produccion_id'], { transaction });
      await queryInterface.addIndex('mermas_produccion', ['producto_id'], { transaction });
      await queryInterface.addIndex('mermas_produccion', ['fecha'], { transaction });

      const motivos = [
        ['RECORTE', 'Recorte'],
        ['DERRAME', 'Derrame'],
        ['SOBRECOCCION', 'Sobrecocción'],
        ['PRODUCTO_QUEMADO', 'Producto quemado'],
        ['CONTAMINACION', 'Contaminación'],
        ['DANO_EMPAQUE', 'Daño de empaque'],
        ['CAIDA', 'Caída'],
        ['ERROR_PROCESO', 'Error de proceso'],
        ['OTRO', 'Otro'],
      ];
      for (const [codigo, nombre] of motivos) {
        await queryInterface.sequelize.query(
          `INSERT INTO motivos_merma
             (id, codigo, nombre, activo, created_at, updated_at)
           VALUES (gen_random_uuid(), :codigo, :nombre, true, NOW(), NOW())
           ON CONFLICT (codigo) DO UPDATE SET
             nombre = EXCLUDED.nombre,
             activo = true,
             updated_at = NOW()`,
          { replacements: { codigo, nombre }, transaction },
        );
      }

      const permisos = [
        ['produccion.control.ver', 'Consultar el control operativo de las OT en producción'],
        ['produccion.control.editar', 'Registrar la producción real de una OT'],
        ['produccion.mermas.registrar', 'Registrar y administrar mermas de producción'],
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
        `INSERT INTO role_permissions (rol_id, permiso_id)
         SELECT r.id, p.id
         FROM roles r
         CROSS JOIN permissions p
         WHERE r.nombre = 'Administrador'
           AND p.nombre IN (
             'produccion.control.ver',
             'produccion.control.editar',
             'produccion.mermas.registrar'
           )
           AND NOT EXISTS (
             SELECT 1 FROM role_permissions rp
             WHERE rp.rol_id = r.id AND rp.permiso_id = p.id
           )`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `INSERT INTO menus (id, nombre, ruta, icono, orden, estado, "createdAt", "updatedAt")
         SELECT gen_random_uuid(), 'Control de producción', '/produccion/control',
                'precision_manufacturing', 42, true, NOW(), NOW()
         WHERE NOT EXISTS (SELECT 1 FROM menus WHERE ruta = '/produccion/control')`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `INSERT INTO role_menus (rol_id, menu_id)
         SELECT r.id, m.id
         FROM roles r
         CROSS JOIN menus m
         WHERE r.nombre = 'Administrador'
           AND m.ruta = '/produccion/control'
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
         WHERE menu_id IN (SELECT id FROM menus WHERE ruta = '/produccion/control')`,
        { transaction },
      );
      await queryInterface.sequelize.query(`DELETE FROM menus WHERE ruta = '/produccion/control'`, {
        transaction,
      });
      await queryInterface.sequelize.query(
        `DELETE FROM role_permissions
         WHERE permiso_id IN (
           SELECT id FROM permissions
           WHERE nombre IN (
             'produccion.control.ver',
             'produccion.control.editar',
             'produccion.mermas.registrar'
           )
         )`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `DELETE FROM permissions
         WHERE nombre IN (
           'produccion.control.ver',
           'produccion.control.editar',
           'produccion.mermas.registrar'
         )`,
        { transaction },
      );
      await queryInterface.dropTable('mermas_produccion', { transaction });
      await queryInterface.dropTable('motivos_merma', { transaction });
      await queryInterface.dropTable('resultados_produccion', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
