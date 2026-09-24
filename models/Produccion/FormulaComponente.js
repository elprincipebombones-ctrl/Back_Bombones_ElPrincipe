const { DataTypes } = require('sequelize');

const sequelize = require('../../database/database');

const FormulaComponente = sequelize.define(
  'FormulaComponente',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    formulaProductoId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'formula_producto_id',
    },
    productoId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'producto_id',
    },
    familiaMpCarnicaId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'familia_mp_carnica_id',
    },
    cantidad: {
      type: DataTypes.DECIMAL(15, 6),
      allowNull: false,
      validate: { min: 0.000001 },
    },
    unidadMedidaId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'unidad_medida_id',
    },
    orden: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1 },
    },
  },
  {
    tableName: 'formula_componentes',
    timestamps: true,
    underscored: true,
  },
);

module.exports = FormulaComponente;
