const { DataTypes } = require('sequelize');
const sequelize = require('../../database/database');

const OrdenProduccionSimulacionDetalle = sequelize.define(
  'OrdenProduccionSimulacionDetalle',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    simulacionId: { type: DataTypes.UUID, allowNull: false, field: 'simulacion_id' },
    productoId: { type: DataTypes.UUID, allowNull: true, field: 'producto_id' },
    familiaMpCarnicaId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'familia_mp_carnica_id',
    },
    cantidadRequerida: {
      type: DataTypes.DECIMAL(18, 6),
      allowNull: false,
      field: 'cantidad_requerida',
    },
    cantidadDisponible: {
      type: DataTypes.DECIMAL(18, 6),
      allowNull: false,
      field: 'cantidad_disponible',
    },
    cantidadFaltante: {
      type: DataTypes.DECIMAL(18, 6),
      allowNull: false,
      field: 'cantidad_faltante',
    },
    unidadMedidaId: { type: DataTypes.UUID, allowNull: false, field: 'unidad_medida_id' },
    estado: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: { isIn: [['OK', 'ADVERTENCIA', 'CRITICA']] },
    },
    advertencias: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  },
  {
    tableName: 'ordenes_produccion_simulacion_detalle',
    timestamps: true,
    underscored: true,
  },
);

module.exports = OrdenProduccionSimulacionDetalle;
