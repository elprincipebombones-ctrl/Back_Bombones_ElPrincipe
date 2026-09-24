const { DataTypes } = require('sequelize');
const sequelize = require('../../database/database');

module.exports = sequelize.define('ConfiguracionStock', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  productoId: { type: DataTypes.UUID, allowNull: false, field: 'producto_id' },
  bodegaId: { type: DataTypes.UUID, allowNull: false, field: 'bodega_id' },
  stockMinimo: { type: DataTypes.DECIMAL(15, 3), allowNull: false, field: 'stock_minimo' },
  puntoReorden: { type: DataTypes.DECIMAL(15, 3), allowNull: false, field: 'punto_reorden' },
  stockMaximo: { type: DataTypes.DECIMAL(15, 3), allowNull: true, field: 'stock_maximo' },
  activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  usuarioId: { type: DataTypes.UUID, allowNull: true, field: 'usuario_id' },
}, { tableName: 'configuraciones_stock', timestamps: true, underscored: true });
