const { DataTypes } = require('sequelize');

const sequelize = require('../../database/database');

const MotivoMerma = sequelize.define(
  'MotivoMerma',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    codigo: { type: DataTypes.STRING(40), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { tableName: 'motivos_merma', timestamps: true, underscored: true },
);

module.exports = MotivoMerma;
