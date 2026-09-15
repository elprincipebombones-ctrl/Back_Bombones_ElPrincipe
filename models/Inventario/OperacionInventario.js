const { DataTypes: T } = require('sequelize');
const sequelize = require('../../database/database');
module.exports = sequelize.define(
  'OperacionInventario',
  {
    id: { type: T.UUID, primaryKey: true, defaultValue: T.UUIDV4 },
    tipo: { type: T.STRING(10), allowNull: false },
    estado: { type: T.STRING(10), allowNull: false, defaultValue: 'BORRADOR' },
    bodegaId: { type: T.UUID, allowNull: false },
    usuarioId: { type: T.UUID, allowNull: false },
    aplicadoPor: T.UUID,
    aplicadoEn: T.DATE,
    nota: T.TEXT,
    idempotencia: { type: T.UUID, unique: true },
    solicitudHash: T.STRING(64),
  },
  { tableName: 'operaciones_inventario', underscored: true },
);
