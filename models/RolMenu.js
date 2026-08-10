const { DataTypes } = require('sequelize');
const sequelize = require('../database/database');

const RolMenu = sequelize.define(
  'RolMenu',
  {
    rolId: { type: DataTypes.UUID, primaryKey: true, field: 'rol_id' },
    menuId: { type: DataTypes.UUID, primaryKey: true, field: 'menu_id' },
  },
  { tableName: 'role_menus', timestamps: false },
);

module.exports = RolMenu;
