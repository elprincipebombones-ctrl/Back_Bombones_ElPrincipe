const { DataTypes } = require('sequelize');
const definir = require('./definirModelo');

module.exports = definir(
  'FormatoLugarInspeccion',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    formatoCalidadId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'formato_calidad_id',
    },
    lugarInspeccionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'lugar_inspeccion_id',
    },
    estado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'activo',
    },
  },
  'formatos_lugares_inspeccion',
  {
    indexes: [
      {
        unique: true,
        fields: ['formato_calidad_id', 'lugar_inspeccion_id'],
      },
    ],
  },
);
