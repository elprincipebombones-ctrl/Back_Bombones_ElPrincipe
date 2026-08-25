'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('criterios_inspeccion', 'nivel_severidad_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'niveles_severidad', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('criterios_inspeccion', 'nivel_severidad_id', {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'niveles_severidad', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });
  },
};

