const { DataTypes } = require('sequelize');
const sequelize = require('../../database/database');

const DetalleMovimiento = sequelize.define(
  'DetalleMovimiento',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    movimientoInventarioId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'movimiento_inventario_id',
    },
    productoId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'producto_id',
    },
    unidadMedidaId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'unidad_medida_id',
    },
    cantidad: {
      type: DataTypes.DECIMAL(15, 3),
      allowNull: false,
    },
    lote: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    loteProveedor: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'lote_proveedor',
    },
    fechaVencimiento: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'fecha_vencimiento',
    },
    costoUnitario: {
      type: DataTypes.DECIMAL(18, 6),
      allowNull: true,
      field: 'costo_unitario',
    },
    costoTotal: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: true,
      field: 'costo_total',
    },
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'detalle_movimiento',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['producto_id'] },
      { fields: ['movimiento_inventario_id'] },
      { fields: ['fecha_vencimiento'] },
      { fields: ['lote'] },
      { fields: ['lote_proveedor'] },
    ],
  },
);

module.exports = DetalleMovimiento;
