const { DataTypes } = require('sequelize');
const sequelize = require('../../database/database');

const MateriaPrima = sequelize.define(
  'MateriaPrima',
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

    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    unidadMedida: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: 'unidad_medida'
    },

    estado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  },
  {
    tableName: 'materias_primas',
    timestamps: true,
    underscored: true
  }
);

module.exports = MateriaPrima;