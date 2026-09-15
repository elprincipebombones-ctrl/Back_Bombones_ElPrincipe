const { DataTypes } = require('sequelize');

const sequelize = require('../../database/database');

const CondicionTermica = sequelize.define(
  'CondicionTermica',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    codigo: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    temperaturaMinima: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
      field: 'temperatura_minima',
    },
    temperaturaMaxima: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
      field: 'temperatura_maxima',
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: 'condiciones_termicas',
    timestamps: true,
    underscored: true,
  },
);

module.exports = CondicionTermica;
