const { DataTypes } = require('sequelize');
const  sequelize  = require('../../database/database');

const Producto = sequelize.define(
  'Producto',
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
    tableName: 'productos',
    timestamps: true,
    underscored: true
  }
);

module.exports = Producto;