const { DataTypes } = require('sequelize');
const sequelize = require('../../database/database');

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

    categoriaProductoId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'categorias_productos',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },

    unidadMedida: {
      type: DataTypes.STRING(20),
      allowNull: false
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