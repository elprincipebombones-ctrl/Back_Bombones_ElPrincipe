const { DataTypes } = require('sequelize');
const definir = require('./definirModelo');

module.exports = definir('ElementoChecklist', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  checklistSeccionId: { type: DataTypes.UUID, allowNull: false, field: 'checklist_seccion_id' },
  elementoInspeccionId: { type: DataTypes.UUID, allowNull: false, field: 'elemento_inspeccion_id' },
  codigoSnapshot: { type: DataTypes.STRING(80), allowNull: false, field: 'codigo_snapshot' },
  nombreSnapshot: { type: DataTypes.STRING(200), allowNull: false, field: 'nombre_snapshot' },
  orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  estado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, 'elementos_checklist');
