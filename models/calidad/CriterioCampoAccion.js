const { DataTypes } = require('sequelize');
const definir = require('./definirModelo');

module.exports = definir(
  'CriterioCampoAccion',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    criterioInspeccionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'criterio_inspeccion_id',
    },
    campoAccionCorrectivaId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'campo_accion_correctiva_id',
    },
    orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    obligatorioOverride: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'obligatorio_override',
    },
  },
  'criterios_campos_accion',
);
