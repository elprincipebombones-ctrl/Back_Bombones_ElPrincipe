const { DataTypes } = require('sequelize');
const definir = require('./definirModelo');

module.exports = definir(
  'TipoCampo',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    codigo: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    descripcion: DataTypes.STRING(255),
    permiteOpciones: { type: DataTypes.BOOLEAN, field: 'permite_opciones', defaultValue: false },
    permiteUnidad: { type: DataTypes.BOOLEAN, field: 'permite_unidad', defaultValue: false },
    estado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  'tipos_campo',
);
