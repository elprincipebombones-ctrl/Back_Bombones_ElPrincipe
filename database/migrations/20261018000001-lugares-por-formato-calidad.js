'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'formatos_lugares_inspeccion',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
          },
          formato_calidad_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: 'formatos_calidad', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          lugar_inspeccion_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: 'lugares_inspeccion', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          activo: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.NOW,
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.NOW,
          },
        },
        { transaction },
      );

      await queryInterface.addConstraint('formatos_lugares_inspeccion', {
        fields: ['formato_calidad_id', 'lugar_inspeccion_id'],
        type: 'unique',
        name: 'uq_formato_lugar_inspeccion',
        transaction,
      });
      await queryInterface.addIndex(
        'formatos_lugares_inspeccion',
        ['formato_calidad_id', 'activo'],
        { name: 'idx_formato_lugar_activo', transaction },
      );
      await queryInterface.addIndex(
        'formatos_lugares_inspeccion',
        ['lugar_inspeccion_id', 'activo'],
        { name: 'idx_lugar_formato_activo', transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('formatos_lugares_inspeccion');
  },
};
