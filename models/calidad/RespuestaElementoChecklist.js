const { DataTypes } = require('sequelize');
const definir = require('./definirModelo');

module.exports = definir('RespuestaElementoChecklist', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  inspeccionId: { type: DataTypes.UUID, allowNull: false, field: 'inspeccion_id' },
  checklistSeccionId: { type: DataTypes.UUID, allowNull: false, field: 'checklist_seccion_id' },
  elementoChecklistId: { type: DataTypes.UUID, allowNull: false, field: 'elemento_checklist_id' },
  elementoInspeccionId: { type: DataTypes.UUID, allowNull: false, field: 'elemento_inspeccion_id' },
  criterioInspeccionId: { type: DataTypes.UUID, allowNull: false, field: 'criterio_inspeccion_id' },
  resultado: { type: DataTypes.STRING(50), allowNull: false },
  cumple: DataTypes.BOOLEAN,
  observacion: DataTypes.TEXT,
  evidenciaUrl: { type: DataTypes.TEXT, field: 'evidencia_url' },
  guardadoPor: { type: DataTypes.UUID, allowNull: false, field: 'guardado_por' },
  fechaGuardado: { type: DataTypes.DATE, allowNull: false, field: 'fecha_guardado' },
}, 'respuestas_elemento_checklist');
