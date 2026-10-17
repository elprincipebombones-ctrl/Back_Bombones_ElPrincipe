module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('pedido_venta_detalle', 'seleccion_lotes', {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'Lotes, bodegas y cantidades elegidos por el usuario en el borrador',
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('pedido_venta_detalle', 'seleccion_lotes');
  },
};
