const { DataTypes } = require('sequelize');
const sequelize = require('../database/database');

const Menu = sequelize.define(
  'Menu',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    ruta: { type: DataTypes.STRING(150), allowNull: false },
    icono: { type: DataTypes.STRING(50), allowNull: true },
    orden: { type: DataTypes.INTEGER, defaultValue: 0 },
    estado: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { tableName: 'menus', timestamps: true },
);

module.exports = Menu;
