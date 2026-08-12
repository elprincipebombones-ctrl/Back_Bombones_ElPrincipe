const { DataTypes } = require('sequelize');
const definir = require('../calidad/definirModelo');

module.exports = definir(
  'ReglaCalidad',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    campoFormatoId: { type: DataTypes.UUID, allowNull: false, field: 'campo_formato_id' },
    codigo: { type: DataTypes.STRING(30), allowNull: false },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    descripcion: DataTypes.STRING(255),
    nivelSeveridadId: { type: DataTypes.UUID, allowNull: true, field: 'nivel_severidad_id' },
    mensajeIncumplimiento: { type: DataTypes.STRING(255), field: 'mensaje_incumplimiento' },
    operadorLogico: {
      type: DataTypes.ENUM('AND', 'OR'),
      allowNull: false,
      defaultValue: 'AND',
      field: 'operador_logico',
    },
    estado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  'reglas_calidad',
);
