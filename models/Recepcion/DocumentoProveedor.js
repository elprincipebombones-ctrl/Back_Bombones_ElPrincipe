const { DataTypes } = require('sequelize');
const sequelize = require('../../database/database');
module.exports = sequelize.define('DocumentoProveedor', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  proveedorId: { type: DataTypes.UUID, allowNull: false, field: 'proveedor_id' },
  tipo: { type: DataTypes.STRING(20), allowNull: false },
  nombreOriginal: { type: DataTypes.STRING(255), allowNull: false, field: 'nombre_original' },
  clave: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  mimeType: { type: DataTypes.STRING(100), allowNull: false, field: 'mime_type' },
  tamano: { type: DataTypes.INTEGER, allowNull: false },
  fechaCarga: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'fecha_carga' },
}, { tableName: 'documentos_proveedor', timestamps: true, underscored: true });
