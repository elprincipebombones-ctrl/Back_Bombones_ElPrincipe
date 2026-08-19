const { DataTypes } = require('sequelize');
const definir = require('./definirModelo');

module.exports = definir(
  'UnidadMedida',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    codigo: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    simbolo: { type: DataTypes.STRING(20), allowNull: false },
    descripcion: DataTypes.STRING(255),
    estado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  'unidades_medida',
);
