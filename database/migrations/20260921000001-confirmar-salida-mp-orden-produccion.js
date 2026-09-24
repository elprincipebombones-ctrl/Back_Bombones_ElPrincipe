const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query(
        `ALTER TABLE ordenes_produccion DROP CONSTRAINT ordenes_produccion_estado_check`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE ordenes_produccion
         ADD CONSTRAINT ordenes_produccion_estado_check
         CHECK (estado IN ('BORRADOR', 'SIMULADA', 'EN_PRODUCCION'))`,
        { transaction },
      );

      await queryInterface.addColumn(
        'ordenes_produccion',
        'movimiento_salida_id',
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

      await queryInterface.changeColumn(
        'detalle_movimiento',
        'cantidad',
        { type: DataTypes.DECIMAL(18, 6), allowNull: false },
        { transaction },
      );
      await queryInterface.addColumn(
        'ordenes_produccion',
        'fecha_salida_mp',
        { type: DataTypes.DATE, allowNull: true },
        { transaction },
      );
      await queryInterface.addColumn(
        'ordenes_produccion',
        'usuario_salida_mp_id',
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
        `CREATE SEQUENCE IF NOT EXISTS movimientos_sa_numero_seq START WITH 1 INCREMENT BY 1`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `SELECT setval(
           'movimientos_sa_numero_seq',
           COALESCE((
             SELECT MAX((regexp_match(numero_documento, '^SA-([0-9]+)$'))[1]::bigint)
             FROM movimientos_inventario
             WHERE tipo_documento = 'SA' AND numero_documento ~ '^SA-[0-9]+$'
           ), 0) + 1,
           false
         )`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `INSERT INTO permissions
           (id, nombre, descripcion, modulo, estado, "createdAt", "updatedAt")
         VALUES (
           gen_random_uuid(),
           'produccion.confirmar_salida_mp',
           'Confirmar la salida real de materias primas desde una OT',
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
        { transaction },
      );
      await queryInterface.sequelize.query(
        `INSERT INTO role_permissions (rol_id, permiso_id)
         SELECT r.id, p.id
         FROM roles r
         CROSS JOIN permissions p
         WHERE r.nombre = 'Administrador'
           AND p.nombre = 'produccion.confirmar_salida_mp'
           AND NOT EXISTS (
             SELECT 1 FROM role_permissions rp
             WHERE rp.rol_id = r.id AND rp.permiso_id = p.id
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
        `DELETE FROM role_permissions
         WHERE permiso_id IN (
           SELECT id FROM permissions WHERE nombre = 'produccion.confirmar_salida_mp'
         )`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `DELETE FROM permissions WHERE nombre = 'produccion.confirmar_salida_mp'`,
        { transaction },
      );
      await queryInterface.removeColumn('ordenes_produccion', 'usuario_salida_mp_id', {
        transaction,
      });
      await queryInterface.removeColumn('ordenes_produccion', 'fecha_salida_mp', { transaction });
      await queryInterface.removeColumn('ordenes_produccion', 'movimiento_salida_id', {
        transaction,
      });
      await queryInterface.changeColumn(
        'detalle_movimiento',
        'cantidad',
        { type: DataTypes.DECIMAL(15, 3), allowNull: false },
        { transaction },
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE ordenes_produccion DROP CONSTRAINT ordenes_produccion_estado_check`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE ordenes_produccion
         ADD CONSTRAINT ordenes_produccion_estado_check
         CHECK (estado IN ('BORRADOR', 'SIMULADA'))`,
        { transaction },
      );
      await queryInterface.sequelize.query('DROP SEQUENCE IF EXISTS movimientos_sa_numero_seq', {
        transaction,
      });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
