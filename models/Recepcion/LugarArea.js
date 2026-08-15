const { DataTypes } = require('sequelize');
const sequelize = require('../../database/database');

const LugarArea = sequelize.define(
  'LugarArea',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },

    codigo: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },

    nombre: {
      type: DataTypes.STRING(150),
      allowNull: false
    },

    tipo: {
      type: DataTypes.STRING(50),
      allowNull: false
    },

    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    estado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  },
  {
    tableName: 'lugares_areas',
    timestamps: true,
    underscored: true
  }
);

module.exports = LugarArea ;