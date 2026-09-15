const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.createTable(
        'condiciones_termicas',
        {
          id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
          },
          codigo: {
            type: DataTypes.STRING(30),
            allowNull: false,
            unique: true,
          },
          nombre: {
            type: DataTypes.STRING(100),
            allowNull: false,
          },
          temperatura_minima: {
            type: DataTypes.DECIMAL(6, 2),
            allowNull: true,
          },
          temperatura_maxima: {
            type: DataTypes.DECIMAL(6, 2),
            allowNull: true,
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
        `INSERT INTO condiciones_termicas
           (id, codigo, nombre, temperatura_minima, temperatura_maxima, activo, created_at, updated_at)
         VALUES
           (gen_random_uuid(), 'REFRIGERADO', 'Refrigerado', 0, 4, true, NOW(), NOW()),
           (gen_random_uuid(), 'CONGELADO', 'Congelado', NULL, 0, true, NOW(), NOW())
         ON CONFLICT (codigo) DO UPDATE SET
           nombre = EXCLUDED.nombre,
           temperatura_minima = EXCLUDED.temperatura_minima,
           temperatura_maxima = EXCLUDED.temperatura_maxima,
           activo = true,
           updated_at = NOW()`,
        { transaction },
      );

      await queryInterface.addColumn(
        'productos',
        'condicion_termica_id',
        {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'condiciones_termicas',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
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
      await queryInterface.removeColumn('productos', 'condicion_termica_id', { transaction });
      await queryInterface.dropTable('condiciones_termicas', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
