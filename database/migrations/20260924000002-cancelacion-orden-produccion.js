const { DataTypes } = require('sequelize');

const PERMISO_CANCELAR = 'produccion.orden.cancelar';

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.addColumn(
        'ordenes_produccion',
        'fecha_cancelacion',
        { type: DataTypes.DATE, allowNull: true },
        { transaction },
      );
      await queryInterface.addColumn(
        'ordenes_produccion',
        'usuario_cancelacion_id',
        {
          type: DataTypes.UUID,
          allowNull: true,
          references: { model: 'usuarios', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        { transaction },
      );
      await queryInterface.addColumn(
        'ordenes_produccion',
        'motivo_cancelacion',
        { type: DataTypes.TEXT, allowNull: true },
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
         CHECK (estado IN ('BORRADOR', 'SIMULADA', 'EN_PRODUCCION', 'CANCELADA'))`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE ordenes_produccion
         ADD CONSTRAINT ordenes_produccion_cancelacion_datos_check
         CHECK (
           estado <> 'CANCELADA'
           OR (
             fecha_cancelacion IS NOT NULL
             AND usuario_cancelacion_id IS NOT NULL
             AND motivo_cancelacion IS NOT NULL
             AND BTRIM(motivo_cancelacion) <> ''
           )
         )`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `INSERT INTO permissions
           (id, nombre, descripcion, modulo, estado, "createdAt", "updatedAt")
         VALUES (
           gen_random_uuid(),
           :permiso,
           'Cancelar órdenes antes de generar la salida de materias primas',
           'Producción',
           true,
           NOW(),
           NOW()
         )
         ON CONFLICT (nombre) DO UPDATE SET
           descripcion = EXCLUDED.descripcion,
           modulo = EXCLUDED.modulo,
           estado = true,
           "updatedAt" = NOW()`,
        { replacements: { permiso: PERMISO_CANCELAR }, transaction },
      );
      await queryInterface.sequelize.query(
        `INSERT INTO role_permissions (rol_id, permiso_id)
         SELECT r.id, p.id
         FROM roles r
         CROSS JOIN permissions p
         WHERE r.nombre = 'Administrador'
           AND p.nombre = :permiso
           AND NOT EXISTS (
             SELECT 1
             FROM role_permissions rp
             WHERE rp.rol_id = r.id
               AND rp.permiso_id = p.id
           )`,
        { replacements: { permiso: PERMISO_CANCELAR }, transaction },
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
           SELECT id FROM permissions WHERE nombre = :permiso
         )`,
        { replacements: { permiso: PERMISO_CANCELAR }, transaction },
      );
      await queryInterface.sequelize.query(`DELETE FROM permissions WHERE nombre = :permiso`, {
        replacements: { permiso: PERMISO_CANCELAR },
        transaction,
      });

      await queryInterface.sequelize.query(
        `ALTER TABLE ordenes_produccion
         DROP CONSTRAINT IF EXISTS ordenes_produccion_cancelacion_datos_check`,
        { transaction },
      );

      await queryInterface.removeColumn('ordenes_produccion', 'motivo_cancelacion', {
        transaction,
      });
      await queryInterface.removeColumn('ordenes_produccion', 'usuario_cancelacion_id', {
        transaction,
      });
      await queryInterface.removeColumn('ordenes_produccion', 'fecha_cancelacion', {
        transaction,
      });

      await queryInterface.sequelize.query(
        `ALTER TABLE ordenes_produccion
         DROP CONSTRAINT IF EXISTS ordenes_produccion_estado_check`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE ordenes_produccion
         ADD CONSTRAINT ordenes_produccion_estado_check
         CHECK (estado IN ('BORRADOR', 'SIMULADA', 'EN_PRODUCCION'))`,
        { transaction },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
