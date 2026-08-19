const { DataTypes } = require('sequelize');
const definir = require('./definirModelo');

module.exports = definir('ChecklistSeccion', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  seccionFormatoId: { type: DataTypes.UUID, allowNull: false, field: 'seccion_formato_id' },
  criterioInspeccionId: { type: DataTypes.UUID, allowNull: false, field: 'criterio_inspeccion_id' },
  nombre: { type: DataTypes.STRING(200), allowNull: false },
  descripcion: DataTypes.TEXT,
  orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  estado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, 'checklists_seccion');
