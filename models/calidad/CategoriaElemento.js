const { DataTypes } = require('sequelize');
const definir = require('./definirModelo');

module.exports = definir('CategoriaElemento', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  codigo: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  nombre: { type: DataTypes.STRING(150), allowNull: false },
  descripcion: DataTypes.TEXT,
  orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  estado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, 'categorias_elemento');
