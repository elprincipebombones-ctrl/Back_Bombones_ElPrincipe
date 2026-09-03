const { DataTypes } = require('sequelize');
const definir = require('./definirModelo');

module.exports = definir(
  'CriterioInspeccion',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    codigo: { type: DataTypes.STRING(80), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(200), allowNull: false },
    pregunta: { type: DataTypes.TEXT, allowNull: false },
    tipoCampoId: { type: DataTypes.UUID, allowNull: false, field: 'tipo_campo_id' },
    resultadoEsperado: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'CUMPLE',
      field: 'resultado_esperado',
    },
    permiteObservacion: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'permite_observacion',
    },
    requiereEvidencia: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'requiere_evidencia',
    },
    nivelSeveridadId: { type: DataTypes.UUID, allowNull: true, field: 'nivel_severidad_id' },
    mensajeIncumplimiento: { type: DataTypes.TEXT, field: 'mensaje_incumplimiento' },
    estado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  'criterios_inspeccion',
);
