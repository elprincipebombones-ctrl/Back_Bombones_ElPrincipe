'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.renameColumn(
      'productos',
      'unidad_medida',
      'unidad_medida_id'
    );
  },

  async down(queryInterface) {
    await queryInterface.renameColumn(
      'productos',
      'unidad_medida_id',
      'unidad_medida'
    );
  }
};