const { DataTypes } = require('sequelize');
const sequelize = require('../../database/database');

const DetalleRecepcion = sequelize.define(
  'DetalleRecepcion',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    recepcionId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    productoId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    unidadMedidaId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    cantidadSolicitada: {
      type: DataTypes.DECIMAL(15, 3),
      allowNull: true,
      field: 'cantidad_solicitada',
    },

    cantidadRecibida: {
      type: DataTypes.DECIMAL(15, 3),
      allowNull: false,
      field: 'cantidad_recibida',
    },

    costoUnitario: {
      type: DataTypes.DECIMAL(18, 6),
      allowNull: true,
      field: 'costo_unitario',
      validate: { min: 0.000001 },
    },

    loteProveedor: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'lote_proveedor',
    },
    fechaVencimiento: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },

    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'detalles_recepcion',
    timestamps: true,
    underscored: true,
  },
);

module.exports = DetalleRecepcion;
