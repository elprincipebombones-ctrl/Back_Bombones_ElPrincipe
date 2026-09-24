const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.sequelize.query(
        `INSERT INTO unidades_medida
           (id, codigo, nombre, simbolo, descripcion, estado, created_at, updated_at)
         VALUES
           (gen_random_uuid(), 'G', 'Gramos', 'g', 'Unidad de masa en gramos', true, NOW(), NOW()),
           (gen_random_uuid(), 'MG', 'Miligramos', 'mg', 'Unidad de masa en miligramos', true, NOW(), NOW()),
           (gen_random_uuid(), 'ML', 'Mililitros', 'ml', 'Unidad de volumen en mililitros', true, NOW(), NOW())
         ON CONFLICT (codigo) DO UPDATE SET
           nombre = EXCLUDED.nombre,
           simbolo = EXCLUDED.simbolo,
           estado = true,
           updated_at = NOW()`,
        { transaction },
      );

      await queryInterface.createTable(
        'conversiones_unidad',
        {
          id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
          },
          unidad_origen_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'unidades_medida', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          unidad_destino_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'unidades_medida', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          factor: {
            type: DataTypes.DECIMAL(20, 9),
            allowNull: false,
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

      await queryInterface.addConstraint('conversiones_unidad', {
        fields: ['unidad_origen_id', 'unidad_destino_id'],
        type: 'unique',
        name: 'conversiones_unidad_origen_destino_unique',
        transaction,
      });
      await queryInterface.sequelize.query(
        `ALTER TABLE conversiones_unidad
         ADD CONSTRAINT conversiones_unidad_factor_positivo_check CHECK (factor > 0)`,
        { transaction },
      );

      const conversiones = [
        ['G', 'KG', 0.001],
        ['MG', 'KG', 0.000001],
        ['KG', 'G', 1000],
        ['KG', 'MG', 1000000],
        ['ML', 'LT', 0.001],
        ['LT', 'ML', 1000],
      ];

      for (const [origen, destino, factor] of conversiones) {
        await queryInterface.sequelize.query(
          `INSERT INTO conversiones_unidad
             (id, unidad_origen_id, unidad_destino_id, factor, activo, created_at, updated_at)
           SELECT gen_random_uuid(), origen.id, destino.id, :factor, true, NOW(), NOW()
           FROM unidades_medida origen
           CROSS JOIN unidades_medida destino
           WHERE origen.codigo = :origen
             AND destino.codigo = :destino
           ON CONFLICT (unidad_origen_id, unidad_destino_id) DO UPDATE SET
             factor = EXCLUDED.factor,
             activo = true,
             updated_at = NOW()`,
          { replacements: { origen, destino, factor }, transaction },
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('conversiones_unidad');
  },
};
