const { DataTypes } = require('sequelize');
const sequelize = require('../database/database.js');

const RolPermiso = sequelize.define( // CREATE TABLE 

  'RolPermiso',
  {
    rolId: { type: DataTypes.UUID, primaryKey: true, field: 'rol_id' },
    permisoId: { type: DataTypes.UUID, primaryKey: true, field: 'permiso_id' },
  },


  { tableName: 'role_permissions', timestamps: false },

);

module.exports = RolPermiso;
