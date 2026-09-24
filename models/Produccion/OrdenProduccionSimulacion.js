const { DataTypes } = require('sequelize');
const sequelize = require('../../database/database');

const OrdenProduccionSimulacion = sequelize.define(
  'OrdenProduccionSimulacion',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    ordenProduccionId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: 'orden_produccion_id',
    },
    fechaSimulacion: { type: DataTypes.DATE, allowNull: false, field: 'fecha_simulacion' },
  },
  { tableName: 'ordenes_produccion_simulacion', timestamps: true, underscored: true },
);

module.exports = OrdenProduccionSimulacion;
