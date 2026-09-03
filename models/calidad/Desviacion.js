const { DataTypes } = require('sequelize');
const definir = require('./definirModelo');

module.exports = definir(
  'Desviacion',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    inspeccionId: { type: DataTypes.UUID, allowNull: false, field: 'inspeccion_id' },
    respuestaInspeccionId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'respuesta_inspeccion_id',
    },
    respuestaElementoChecklistId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'respuesta_elemento_checklist_id',
    },
    reglaCalidadId: { type: DataTypes.UUID, allowNull: true, field: 'regla_calidad_id' },
    nivelSeveridadId: { type: DataTypes.UUID, allowNull: true, field: 'nivel_severidad_id' },
    descripcion: DataTypes.TEXT,
    mensaje: DataTypes.TEXT,
    estado: {
      type: DataTypes.ENUM('ABIERTA', 'EN_TRATAMIENTO', 'CERRADA'),
      allowNull: false,
      defaultValue: 'ABIERTA',
    },
    fechaDeteccion: { type: DataTypes.DATE, allowNull: false, field: 'fecha_deteccion' },
    detectadaPor: { type: DataTypes.UUID, allowNull: true, field: 'detectada_por' },
    fechaCierre: { type: DataTypes.DATE, allowNull: true, field: 'fecha_cierre' },
    cerradaPor: { type: DataTypes.UUID, allowNull: true, field: 'cerrada_por' },
  },
  'desviaciones',
);
