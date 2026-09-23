const { DataTypes } = require('sequelize');
const sequelize = require('../../database/database');

const OrdenProduccionDetalle = sequelize.define(
  'OrdenProduccionDetalle',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    ordenProduccionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'orden_produccion_id',
    },
    productoTerminadoId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'producto_terminado_id',
    },
    cantidad: {
      type: DataTypes.DECIMAL(18, 6),
      allowNull: false,
      validate: { min: 0.000001 },
    },
  },
  { tableName: 'ordenes_produccion_detalle', timestamps: true, underscored: true },
);

module.exports = OrdenProduccionDetalle;
