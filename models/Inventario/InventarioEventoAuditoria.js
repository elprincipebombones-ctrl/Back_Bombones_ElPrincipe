const { DataTypes } = require('sequelize');
const sequelize = require('../../database/database');

module.exports = sequelize.define(
  'InventarioEventoAuditoria',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    evento: { type: DataTypes.STRING(60), allowNull: false },
    usuarioId: { type: DataTypes.UUID, allowNull: false, field: 'usuario_id' },
    bloqueoId: { type: DataTypes.UUID, allowNull: false, field: 'bloqueo_id' },
    productoId: { type: DataTypes.UUID, allowNull: false, field: 'producto_id' },
    bodegaId: { type: DataTypes.UUID, allowNull: false, field: 'bodega_id' },
    unidadMedidaId: { type: DataTypes.UUID, allowNull: false, field: 'unidad_medida_id' },
    lote: DataTypes.STRING(100),
    fechaVencimiento: { type: DataTypes.DATEONLY, field: 'fecha_vencimiento' },
    motivo: DataTypes.TEXT,
    origen: DataTypes.STRING(20),
    ip: DataTypes.STRING(64),
    metadatos: DataTypes.JSONB,
    ocurridoEn: { type: DataTypes.DATE, allowNull: false, field: 'ocurrido_en' },
  },
  { tableName: 'inventario_eventos_auditoria', timestamps: false, underscored: true },
);
