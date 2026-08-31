const { DataTypes } = require('sequelize');
const definir = require('./definirModelo');

module.exports = definir(
  'ParametroCampoAccion',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    parametroCalidadId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'parametro_calidad_id',
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
  'parametros_campos_accion',
);
