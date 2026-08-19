const { DataTypes } = require('sequelize');
const definir = require('./definirModelo');

module.exports = definir(
  'SeccionFormato',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    versionFormatoId: { type: DataTypes.UUID, allowNull: false, field: 'version_formato_id' },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    descripcion: DataTypes.STRING(255),
    orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    estado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  'secciones_formato',
);
