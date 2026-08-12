const { DataTypes } = require('sequelize');
const definir = require('./definirModelo');

module.exports = definir(
  'ParametroCalidad',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    codigo: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    descripcion: DataTypes.STRING(255),
    unidadMedidaId: { type: DataTypes.UUID, allowNull: true, field: 'unidad_medida_id' },
    estado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  'parametros_calidad',
);
