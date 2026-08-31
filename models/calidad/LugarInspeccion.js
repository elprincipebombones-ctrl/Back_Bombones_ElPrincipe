const { DataTypes } = require('sequelize');
const definir = require('./definirModelo');

module.exports = definir(
  'LugarInspeccion',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    categoriaLugarInspeccionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'categoria_lugar_inspeccion_id',
    },
    orden: { type: DataTypes.INTEGER, allowNull: false },
    estado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'activo' },
  },
  'lugares_inspeccion',
);
