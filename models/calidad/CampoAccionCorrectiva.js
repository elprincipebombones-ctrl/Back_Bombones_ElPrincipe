const { DataTypes } = require('sequelize');
const definir = require('./definirModelo');

module.exports = definir(
  'CampoAccionCorrectiva',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    codigo: { type: DataTypes.STRING(80), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(200), allowNull: false },
    descripcion: { type: DataTypes.STRING(500), allowNull: true },
    obligatorio: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    estado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'activo' },
  },
  'campos_accion_correctiva',
);
