const { DataTypes } = require('sequelize');

const sequelize = require('../../database/database');

const FamiliaMpCarnica = sequelize.define(
  'FamiliaMpCarnica',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: 'familias_mp_carnicas',
    timestamps: true,
    underscored: true,
  },
);

module.exports = FamiliaMpCarnica;
