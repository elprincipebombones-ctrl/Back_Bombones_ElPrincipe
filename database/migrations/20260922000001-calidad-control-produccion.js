const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query(
        `INSERT INTO tipos_inspeccion
           (id, codigo, nombre, descripcion, estado, created_at, updated_at)
         VALUES (gen_random_uuid(), 'PRODUCCION', 'Producción',
                 'Inspecciones ejecutadas desde una orden de producción', true, NOW(), NOW())
         ON CONFLICT (codigo) DO UPDATE SET
           nombre = EXCLUDED.nombre,
           estado = true,
           updated_at = NOW()`,
        { transaction },
      );

      await queryInterface.addColumn(
        'inspecciones',
        'orden_produccion_id',
        {
          type: DataTypes.UUID,
          allowNull: true,
          references: { model: 'ordenes_produccion', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        { transaction },
      );
      await queryInterface.addColumn(
        'inspecciones',
        'producto_id',
        {
          type: DataTypes.UUID,
          allowNull: true,
          references: { model: 'productos', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        { transaction },
      );
      await queryInterface.addColumn(
        'inspecciones',
        'lote',
        { type: DataTypes.STRING(100), allowNull: true },
        { transaction },
      );
      await queryInterface.addColumn(
        'inspecciones',
        'fecha_vencimiento',
        { type: DataTypes.DATEONLY, allowNull: true },
        { transaction },
      );
      await queryInterface.addIndex('inspecciones', ['orden_produccion_id'], { transaction });
      await queryInterface.addIndex('inspecciones', ['producto_id'], { transaction });

      await queryInterface.addColumn(
        'campos_formato',
        'es_calculado',
        { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        { transaction },
      );
      await queryInterface.addColumn(
        'campos_formato',
        'campo_numerador_id',
        {
          type: DataTypes.UUID,
          allowNull: true,
          references: { model: 'campos_formato', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        { transaction },
      );
      await queryInterface.addColumn(
        'campos_formato',
        'campo_denominador_id',
        {
          type: DataTypes.UUID,
          allowNull: true,
          references: { model: 'campos_formato', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        { transaction },
      );
      await queryInterface.addColumn(
        'campos_formato',
        'multiplicador',
        { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 100 },
        { transaction },
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE campos_formato
         ADD CONSTRAINT campos_formato_calculo_check CHECK (
           (es_calculado = false AND campo_numerador_id IS NULL AND campo_denominador_id IS NULL)
           OR
           (es_calculado = true AND campo_numerador_id IS NOT NULL
             AND campo_denominador_id IS NOT NULL
             AND campo_numerador_id <> campo_denominador_id)
         ),
         ADD CONSTRAINT campos_formato_multiplicador_check CHECK (multiplicador > 0)`,
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
        `ALTER TABLE campos_formato
         DROP CONSTRAINT IF EXISTS campos_formato_calculo_check,
         DROP CONSTRAINT IF EXISTS campos_formato_multiplicador_check`,
        { transaction },
      );
      await queryInterface.removeColumn('campos_formato', 'multiplicador', { transaction });
      await queryInterface.removeColumn('campos_formato', 'campo_denominador_id', { transaction });
      await queryInterface.removeColumn('campos_formato', 'campo_numerador_id', { transaction });
      await queryInterface.removeColumn('campos_formato', 'es_calculado', { transaction });
      await queryInterface.removeColumn('inspecciones', 'fecha_vencimiento', { transaction });
      await queryInterface.removeColumn('inspecciones', 'lote', { transaction });
      await queryInterface.removeColumn('inspecciones', 'producto_id', { transaction });
      await queryInterface.removeColumn('inspecciones', 'orden_produccion_id', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
