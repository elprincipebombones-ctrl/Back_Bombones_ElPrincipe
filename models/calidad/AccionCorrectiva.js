const { DataTypes } = require('sequelize');
const definir = require('./definirModelo');

module.exports = definir(
  'AccionCorrectiva',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    desviacionId: { type: DataTypes.UUID, allowNull: false, field: 'desviacion_id' },
    tipoAccionId: { type: DataTypes.UUID, allowNull: false, field: 'tipo_accion_id' },
    descripcion: DataTypes.TEXT,
    estado: {
      type: DataTypes.ENUM('PENDIENTE', 'EN_PROCESO', 'CERRADA'),
      allowNull: false,
      defaultValue: 'PENDIENTE',
    },
    responsableId: { type: DataTypes.UUID, allowNull: true, field: 'responsable_id' },
    fechaAsignacion: { type: DataTypes.DATE, allowNull: false, field: 'fecha_asignacion' },
    fechaLimite: { type: DataTypes.DATE, allowNull: true, field: 'fecha_limite' },
    fechaInicio: { type: DataTypes.DATE, allowNull: true, field: 'fecha_inicio' },
    fechaCierre: { type: DataTypes.DATE, allowNull: true, field: 'fecha_cierre' },
    cerradaPor: { type: DataTypes.UUID, allowNull: true, field: 'cerrada_por' },
    observacionCierre: { type: DataTypes.TEXT, field: 'observacion_cierre' },
  },
  'acciones_correctivas',
);
