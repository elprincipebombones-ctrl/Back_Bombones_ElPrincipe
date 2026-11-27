const { DataTypes } = require('sequelize');
const sequelize = require('../../database/database');

module.exports = sequelize.define(
  'DocumentoRecepcion',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    recepcionId: { type: DataTypes.UUID, allowNull: false },
    nombreArchivo: { type: DataTypes.STRING(255), allowNull: false },
    tipoArchivo: { type: DataTypes.STRING(100), allowNull: false },
    nombreInterno: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    subidoPor: { type: DataTypes.UUID, allowNull: false },
  },
  { tableName: 'documentos_recepcion', timestamps: true, underscored: true },
);
