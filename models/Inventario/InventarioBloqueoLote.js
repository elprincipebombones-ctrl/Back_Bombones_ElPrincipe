const { DataTypes } = require('sequelize');
const sequelize = require('../../database/database');

const InventarioBloqueoLote = sequelize.define(
  'InventarioBloqueoLote',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    productoId: { type: DataTypes.UUID, allowNull: false, field: 'producto_id' },
    bodegaId: { type: DataTypes.UUID, allowNull: false, field: 'bodega_id' },
    unidadMedidaId: { type: DataTypes.UUID, allowNull: false, field: 'unidad_medida_id' },
    lote: { type: DataTypes.STRING(100), allowNull: true },
    fechaVencimiento: { type: DataTypes.DATEONLY, allowNull: true, field: 'fecha_vencimiento' },
    estado: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'CONGELADO' },
    motivo: { type: DataTypes.TEXT, allowNull: false },
    origen: { type: DataTypes.STRING(20), allowNull: true },
    inspeccionCalidadId: { type: DataTypes.UUID, allowNull: true, field: 'inspeccion_calidad_id' },
    accionCorrectivaId: { type: DataTypes.UUID, allowNull: true, field: 'accion_correctiva_id' },
    congeladoPorId: { type: DataTypes.UUID, allowNull: false, field: 'congelado_por_id' },
    congeladoEn: { type: DataTypes.DATE, allowNull: false, field: 'congelado_en' },
    liberadoPorId: { type: DataTypes.UUID, allowNull: true, field: 'liberado_por_id' },
    liberadoEn: { type: DataTypes.DATE, allowNull: true, field: 'liberado_en' },
    notaLiberacion: { type: DataTypes.TEXT, allowNull: true, field: 'nota_liberacion' },
  },
  { tableName: 'inventario_bloqueos_lote', timestamps: true, underscored: true },
);

module.exports = InventarioBloqueoLote;
