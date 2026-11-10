const { DataTypes } = require('sequelize');
const definir = require('./definirModelo');

module.exports = definir(
  'FormatoCalidad',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    codigo: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
      validate: { len: [2, 30], is: /^[A-Z0-9_-]+$/ },
    },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    descripcion: DataTypes.STRING(255),
    tipoInspeccionId: { type: DataTypes.UUID, allowNull: false, field: 'tipo_inspeccion_id' },
    programaId: { type: DataTypes.UUID, allowNull: true, field: 'programa_id' },
    estado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  'formatos_calidad',
  { codigoAutomatico: false },
);
