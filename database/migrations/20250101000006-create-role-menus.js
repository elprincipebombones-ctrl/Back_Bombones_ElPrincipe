'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('role_menus', {
      rol_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        references: { model: 'roles', key: 'id' },
        onDelete: 'CASCADE',
      },
      menu_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        references: { model: 'menus', key: 'id' },
        onDelete: 'CASCADE',
      },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('role_menus');
  },
};
