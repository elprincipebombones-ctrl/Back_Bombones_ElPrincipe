const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.createTable(
        'familias_mp_carnicas',
        {
          id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
          },
          nombre: {
            type: DataTypes.STRING(100),
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

      await queryInterface.sequelize.query(
        `CREATE UNIQUE INDEX familias_mp_carnicas_nombre_unique
         ON familias_mp_carnicas (LOWER(BTRIM(nombre)))`,
        { transaction },
      );

      await queryInterface.addColumn(
        'productos',
        'familia_mp_carnica_id',
        {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'familias_mp_carnicas',
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
      await queryInterface.removeColumn('productos', 'familia_mp_carnica_id', { transaction });
      await queryInterface.dropTable('familias_mp_carnicas', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
