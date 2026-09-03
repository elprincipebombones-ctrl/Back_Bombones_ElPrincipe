const { DataTypes } = require('sequelize');
const definir = require('./definirModelo');

module.exports = definir(
  'ProgramacionFormato',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    formatoCalidadId: { type: DataTypes.UUID, allowNull: false, field: 'formato_calidad_id' },
    horaProgramada: { type: DataTypes.TIME, allowNull: true, field: 'hora_programada' },
    fechaInicio: { type: DataTypes.DATEONLY, allowNull: false, field: 'fecha_inicio' },
    fechaFin: { type: DataTypes.DATEONLY, allowNull: true, field: 'fecha_fin' },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  'programaciones_formato',
);
