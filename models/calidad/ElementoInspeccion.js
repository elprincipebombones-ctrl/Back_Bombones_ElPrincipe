const { DataTypes } = require('sequelize');
const definir = require('./definirModelo');

module.exports = definir('ElementoInspeccion', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  categoriaElementoId: { type: DataTypes.UUID, allowNull: false, field: 'categoria_elemento_id' },
  codigo: { type: DataTypes.STRING(80), allowNull: false, unique: true },
  nombre: { type: DataTypes.STRING(200), allowNull: false },
  descripcion: DataTypes.TEXT,
  orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  estado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, 'elementos_inspeccion');
