const { DataTypes } = require('sequelize');
const sequelize = require('../../database/database');

const CategoriaProducto = sequelize.define(
  'CategoriaProducto',
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

    estado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  },
  {
    tableName: 'categorias_productos',
    timestamps: true,
    underscored: true
  }
);

module.exports = CategoriaProducto;