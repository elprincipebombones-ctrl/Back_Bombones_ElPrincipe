const { DataTypes } = require('sequelize');
const definir = require('./definirModelo');

module.exports = definir(
  'TipoInspeccion',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    codigo: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    descripcion: DataTypes.STRING(255),
    estado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  'tipos_inspeccion',
);
