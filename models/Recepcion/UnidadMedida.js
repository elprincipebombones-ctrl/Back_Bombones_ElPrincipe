const { DataTypes } = require('sequelize');

const sequelize = require('../../database/database');

const UnidadMedida = sequelize.define(
  'UnidadMedida',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    codigo: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },

    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    simbolo: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },

    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    estado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: 'unidades_medida',
    timestamps: true,
    underscored: true,
  },
);

module.exports = UnidadMedida;
