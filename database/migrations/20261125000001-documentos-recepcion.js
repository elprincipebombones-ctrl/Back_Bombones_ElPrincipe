'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('documentos_recepcion', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      recepcion_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'recepciones', key: 'id' },
        onDelete: 'RESTRICT',
      },
      nombre_archivo: { type: Sequelize.STRING(255), allowNull: false },
      tipo_archivo: { type: Sequelize.STRING(100), allowNull: false },
      nombre_interno: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      subido_por: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('documentos_recepcion', ['recepcion_id']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('documentos_recepcion');
  },
};
