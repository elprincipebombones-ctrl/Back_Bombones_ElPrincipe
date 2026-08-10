'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('menus', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      ruta: { type: Sequelize.STRING(150), allowNull: false },
      icono: { type: Sequelize.STRING(50) },
      orden: { type: Sequelize.INTEGER, defaultValue: 0 },
      estado: { type: Sequelize.BOOLEAN, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('menus');
  },
};
