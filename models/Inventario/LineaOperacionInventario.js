const { DataTypes: T } = require('sequelize');
const sequelize = require('../../database/database');
module.exports = sequelize.define(
  'LineaOperacionInventario',
  {
    id: { type: T.UUID, primaryKey: true, defaultValue: T.UUIDV4 },
    operacionId: { type: T.UUID, allowNull: false },
    productoId: { type: T.UUID, allowNull: false },
    unidadMedidaId: { type: T.UUID, allowNull: false },
    bodegaDestinoId: T.UUID,
    lote: T.STRING(100),
    fechaVencimiento: T.DATEONLY,
    cantidadSistema: { type: T.DECIMAL(15, 3), allowNull: false },
    cantidadContada: T.DECIMAL(15, 3),
    cantidad: { type: T.DECIMAL(15, 3), allowNull: false },
    huella: { type: T.STRING(32), allowNull: false },
  },
  { tableName: 'lineas_operacion_inventario', underscored: true, timestamps: false },
);
