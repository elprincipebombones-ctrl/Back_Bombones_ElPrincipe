const { DataTypes } = require('sequelize');
const definir = require('./definirModelo');

module.exports = definir(
  'ProgramaCalidad',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    descripcion: { type: DataTypes.STRING(500), allowNull: true },
    archivoPdf: { type: DataTypes.TEXT, allowNull: true, field: 'archivo_pdf' },
    estado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  'programas_calidad',
);
