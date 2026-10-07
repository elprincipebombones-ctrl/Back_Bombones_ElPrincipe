const { DataTypes } = require('sequelize');
const sequelize = require('../../database/database');

module.exports = sequelize.define(
  'PedidoVentaDetalle',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    pedidoVentaId: { type: DataTypes.UUID, allowNull: false, field: 'pedido_venta_id' },
    productoId: { type: DataTypes.UUID, allowNull: false, field: 'producto_id' },
    cantidad: { type: DataTypes.DECIMAL(18, 3), allowNull: false },
    despachos: { type: DataTypes.JSONB, allowNull: true },
    seleccionLotes: { type: DataTypes.JSONB, allowNull: true, field: 'seleccion_lotes' },
    unidadMedidaId: { type: DataTypes.UUID, allowNull: false, field: 'unidad_medida_id' },
  },
  {
    tableName: 'pedido_venta_detalle',
    timestamps: true,
    underscored: true,
  },
);
