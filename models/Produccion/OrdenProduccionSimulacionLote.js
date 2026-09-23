const { DataTypes } = require('sequelize');
const sequelize = require('../../database/database');

const OrdenProduccionSimulacionLote = sequelize.define(
  'OrdenProduccionSimulacionLote',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    detalleSimulacionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'detalle_simulacion_id',
    },
    productoId: { type: DataTypes.UUID, allowNull: false, field: 'producto_id' },
    lote: { type: DataTypes.STRING(100), allowNull: true },
    bodegaId: { type: DataTypes.UUID, allowNull: false, field: 'bodega_id' },
    fechaVencimiento: { type: DataTypes.DATEONLY, allowNull: true, field: 'fecha_vencimiento' },
    saldoDisponible: {
      type: DataTypes.DECIMAL(18, 6),
      allowNull: false,
      field: 'saldo_disponible',
    },
    cantidad: { type: DataTypes.DECIMAL(18, 6), allowNull: false },
    esSugerenciaFefo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'es_sugerencia_fefo',
    },
    seleccionManual: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'seleccion_manual',
    },
  },
  {
    tableName: 'ordenes_produccion_simulacion_lotes',
    timestamps: true,
    underscored: true,
  },
);

module.exports = OrdenProduccionSimulacionLote;
