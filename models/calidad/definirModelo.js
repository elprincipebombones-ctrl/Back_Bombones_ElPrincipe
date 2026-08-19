const sequelize = require('../../database/database');

module.exports = (nombre, atributos, tableName, opciones = {}) =>
  sequelize.define(nombre, atributos, {
    tableName,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    ...opciones,
  });
