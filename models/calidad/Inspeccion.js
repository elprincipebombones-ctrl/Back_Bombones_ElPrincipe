const { DataTypes } = require('sequelize');
const definir = require('./definirModelo');

module.exports = definir(
  'Inspeccion',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    versionFormatoId: { type: DataTypes.UUID, allowNull: false, field: 'version_formato_id' },
    lugarInspeccionId: { type: DataTypes.UUID, allowNull: true, field: 'lugar_inspeccion_id' },
    estado: {
      type: DataTypes.ENUM('BORRADOR', 'COMPLETADA', 'PENDIENTE_ACCION', 'CERRADA'),
      allowNull: false,
      defaultValue: 'BORRADOR',
    },
    fechaInspeccion: { type: DataTypes.DATEONLY, allowNull: false, field: 'fecha_inspeccion' },
    iniciadaPor: { type: DataTypes.UUID, allowNull: false, field: 'iniciada_por' },
    fechaInicio: { type: DataTypes.DATE, allowNull: false, field: 'fecha_inicio' },
    fechaCompletada: { type: DataTypes.DATE, allowNull: true, field: 'fecha_completada' },
    cerradaPor: { type: DataTypes.UUID, allowNull: true, field: 'cerrada_por' },
    fechaCierre: { type: DataTypes.DATE, allowNull: true, field: 'fecha_cierre' },
    observaciones: DataTypes.TEXT,
  },
  'inspecciones',
);
