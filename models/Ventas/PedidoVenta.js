const { DataTypes } = require('sequelize');
const sequelize = require('../../database/database');

module.exports = sequelize.define(
  'PedidoVenta',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    numero: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    fecha: { type: DataTypes.DATE, allowNull: false },
    clienteId: { type: DataTypes.UUID, allowNull: false, field: 'cliente_id' },
    usuarioId: { type: DataTypes.UUID, allowNull: false, field: 'usuario_id' },
    estado: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'BORRADOR' },
    observaciones: { type: DataTypes.TEXT, allowNull: true },
    fechaCancelacion: { type: DataTypes.DATE, allowNull: true, field: 'fecha_cancelacion' },
    usuarioCancelacionId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'usuario_cancelacion_id',
    },
    motivoCancelacion: { type: DataTypes.TEXT, allowNull: true, field: 'motivo_cancelacion' },
  },
  {
    tableName: 'pedidos_venta',
    timestamps: true,
    underscored: true,
  },
);
