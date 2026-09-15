const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const detalles = await queryInterface.describeTable('detalles_recepcion', { transaction });
      if (!detalles.costo_unitario) {
        await queryInterface.addColumn(
          'detalles_recepcion',
          'costo_unitario',
          {
            type: DataTypes.DECIMAL(18, 6),
            allowNull: true,
          },
          { transaction },
        );
      }

      await queryInterface.sequelize.query(
        `ALTER TABLE detalles_recepcion
         DROP CONSTRAINT IF EXISTS detalles_recepcion_costo_unitario_check`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE detalles_recepcion
         ADD CONSTRAINT detalles_recepcion_costo_unitario_check
         CHECK (costo_unitario IS NULL OR costo_unitario > 0)`,
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
        `ALTER TABLE detalles_recepcion
         DROP CONSTRAINT IF EXISTS detalles_recepcion_costo_unitario_check`,
        { transaction },
      );
      const detalles = await queryInterface.describeTable('detalles_recepcion', { transaction });
      if (detalles.costo_unitario) {
        await queryInterface.removeColumn('detalles_recepcion', 'costo_unitario', { transaction });
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
