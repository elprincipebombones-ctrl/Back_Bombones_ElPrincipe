const { DataTypes } = require('sequelize');
const sequelize = require('../database/database');

const Permiso = sequelize.define(
  'Permiso',
  {
    id: { type: DataTypes.UUID,  defaultValue: DataTypes.UUIDV4,  primaryKey: true,   },
    nombre: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    descripcion: { type: DataTypes.STRING(255), allowNull: true },
    modulo: { type: DataTypes.STRING(50), allowNull: true },
    estado: { type: DataTypes.BOOLEAN, defaultValue: true },
  },

  { tableName: 'permissions', timestamps: true },
);

module.exports = Permiso;



