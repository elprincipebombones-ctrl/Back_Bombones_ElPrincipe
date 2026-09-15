const { DataTypes } = require('sequelize');
const definir = require('./definirModelo');

module.exports = definir(
  'TareaAccionCorrectiva',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    accionCorrectivaId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: 'accion_correctiva_id',
    },
    usuarioAsignadoId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'usuario_asignado_id',
    },
    fechaLimite: { type: DataTypes.DATEONLY, allowNull: false, field: 'fecha_limite' },
    descripcion: { type: DataTypes.TEXT, allowNull: false },
    documentacion: { type: DataTypes.TEXT, allowNull: true },
    estado: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'PENDIENTE',
      validate: { isIn: [['PENDIENTE', 'COMPLETADA']] },
    },
    fechaCompletada: { type: DataTypes.DATE, allowNull: true, field: 'fecha_completada' },
  },
  'tareas_accion_correctiva',
);
