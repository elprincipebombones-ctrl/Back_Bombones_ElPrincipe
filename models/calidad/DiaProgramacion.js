const { DataTypes } = require('sequelize');
const definir = require('./definirModelo');

module.exports = definir('DiaProgramacion', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  programacionFormatoId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'programacion_formato_id',
  },
  diaSemana: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'dia_semana',
    validate: { min: 1, max: 7 },
  },
}, 'dias_programacion');
