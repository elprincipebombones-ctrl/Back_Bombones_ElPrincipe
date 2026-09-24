const { DataTypes } = require('sequelize');

const sequelize = require('../../database/database');

const ConversionUnidad = sequelize.define(
  'ConversionUnidad',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    unidadOrigenId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'unidad_origen_id',
    },
    unidadDestinoId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'unidad_destino_id',
    },
    factor: {
      type: DataTypes.DECIMAL(20, 9),
      allowNull: false,
      validate: { min: 0.000000001 },
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: 'conversiones_unidad',
    timestamps: true,
    underscored: true,
  },
);

module.exports = ConversionUnidad;
