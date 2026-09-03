const { DataTypes } = require('sequelize');
const definir = require('./definirModelo');

module.exports = definir(
  'AccionCriterio',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    criterioInspeccionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'criterio_inspeccion_id',
    },
    tipoAccionId: { type: DataTypes.UUID, allowNull: false, field: 'tipo_accion_id' },
    orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    estado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  'acciones_criterio',
);
