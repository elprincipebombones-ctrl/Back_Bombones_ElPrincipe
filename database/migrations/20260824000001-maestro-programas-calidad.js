'use strict';

const pk = (Sequelize) => ({
  type: Sequelize.UUID,
  defaultValue: Sequelize.literal('gen_random_uuid()'),
  primaryKey: true,
});

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const options = { transaction };
      await queryInterface.createTable(
        'programas_calidad',
        {
          id: pk(Sequelize),
          nombre: { type: Sequelize.STRING(100), allowNull: false },
          descripcion: { type: Sequelize.STRING(500), allowNull: true },
          archivo_pdf: { type: Sequelize.TEXT, allowNull: true },
          estado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
          created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
          updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
        },
        options,
      );
      await queryInterface.addIndex('programas_calidad', ['estado'], options);
      await queryInterface.addColumn(
        'formatos_calidad',
        'programa_id',
        {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'programas_calidad', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        options,
      );
      await queryInterface.addIndex('formatos_calidad', ['programa_id'], options);
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const options = { transaction };
      await queryInterface.removeColumn('formatos_calidad', 'programa_id', options);
      await queryInterface.dropTable('programas_calidad', options);
    });
  },
};
