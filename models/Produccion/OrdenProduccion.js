const { DataTypes } = require('sequelize');
const sequelize = require('../../database/database');

const OrdenProduccion = sequelize.define(
  'OrdenProduccion',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    numero: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    fecha: { type: DataTypes.DATEONLY, allowNull: false },
    usuarioId: { type: DataTypes.UUID, allowNull: false, field: 'usuario_id' },
    estado: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'BORRADOR',
      validate: { isIn: [['BORRADOR', 'SIMULADA', 'EN_PRODUCCION']] },
    },
    observaciones: { type: DataTypes.TEXT, allowNull: true },
    movimientoSalidaId: { type: DataTypes.UUID, allowNull: true, field: 'movimiento_salida_id' },
    fechaSalidaMp: { type: DataTypes.DATE, allowNull: true, field: 'fecha_salida_mp' },
    usuarioSalidaMpId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'usuario_salida_mp_id',
    },
  },
  { tableName: 'ordenes_produccion', timestamps: true, underscored: true },
);

module.exports = OrdenProduccion;
