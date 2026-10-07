module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('pedido_venta_detalle', 'despachos', {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'Distribución histórica despachada por lote y bodega; null para pedidos antiguos',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('pedido_venta_detalle', 'despachos');
  },
};
