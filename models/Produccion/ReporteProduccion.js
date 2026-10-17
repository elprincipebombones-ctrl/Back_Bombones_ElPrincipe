const { DataTypes } = require('sequelize');
const sequelize = require('../../database/database');

module.exports = sequelize.define(
  'ReporteProduccion',
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    ordenProduccionId: { type: DataTypes.UUID, allowNull: false, field: 'orden_produccion_id' },
    productoTerminadoId: { type: DataTypes.UUID, allowNull: false, field: 'producto_terminado_id' },
    lote: { type: DataTypes.STRING(30), allowNull: false },
    cantidad: { type: DataTypes.DECIMAL(18, 6), allowNull: false, validate: { min: 0.000001 } },
    unidadMedidaId: { type: DataTypes.UUID, allowNull: false, field: 'unidad_medida_id' },
    usuarioId: { type: DataTypes.UUID, allowNull: false, field: 'usuario_id' },
    fecha: { type: DataTypes.DATE, allowNull: false },
    movimientoSalidaId: { type: DataTypes.UUID, field: 'movimiento_salida_id' },
    movimientoEntradaId: { type: DataTypes.UUID, field: 'movimiento_entrada_id' },
  },
  { tableName: 'reportes_produccion', timestamps: true, underscored: true },
);
