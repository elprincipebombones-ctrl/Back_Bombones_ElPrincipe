const { DataTypes } = require('sequelize');
const sequelize = require('../database/database');
module.exports = sequelize.define(
  'Cargo',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    descripcion: { type: DataTypes.STRING(255) },
    estado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { tableName: 'cargos', timestamps: true },
);
