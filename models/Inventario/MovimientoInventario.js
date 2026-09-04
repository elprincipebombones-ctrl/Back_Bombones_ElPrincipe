const { DataTypes } = require('sequelize');
const sequelize = require('../../database/database');

const MovimientoInventario = sequelize.define(
  'MovimientoInventario',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tipoDocumento: {
      type: DataTypes.STRING(2),
      allowNull: false,
      field: 'tipo_documento',
      validate: {
        isIn: [['EN', 'SA', 'AJ', 'TR']],
      },
    },
    numeroDocumento: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'numero_documento',
    },
    fecha: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    bodegaId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'bodega_id',
    },
    estado: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'APLICADO',
    },
    origen: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    origenId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'origen_id',
    },
    usuarioId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'usuario_id',
    },
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'movimientos_inventario',
    timestamps: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['origen', 'origen_id'] },
      { fields: ['tipo_documento'] },
      { fields: ['fecha'] },
      { fields: ['bodega_id'] },
    ],
  },
);

module.exports = MovimientoInventario;
