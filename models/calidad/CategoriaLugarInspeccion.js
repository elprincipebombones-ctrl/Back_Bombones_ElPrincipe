const { DataTypes } = require('sequelize');
const definir = require('./definirModelo');

module.exports = definir(
  'CategoriaLugarInspeccion',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    orden: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    estado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'activo' },
  },
  'categorias_lugar_inspeccion',
);
