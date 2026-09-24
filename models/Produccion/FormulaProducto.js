const { DataTypes } = require('sequelize');

const sequelize = require('../../database/database');

const FormulaProducto = sequelize.define(
  'FormulaProducto',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    productoTerminadoId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'producto_terminado_id',
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: 'formula_producto',
    timestamps: true,
    underscored: true,
  },
);

module.exports = FormulaProducto;
