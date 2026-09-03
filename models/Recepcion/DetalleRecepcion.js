const { DataTypes } = require('sequelize');
const sequelize = require('../../database/database');

const DetalleRecepcion = sequelize.define(
  'DetalleRecepcion',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },

    recepcionId: {
      type: DataTypes.UUID,
      allowNull: false
    },

    productoId: {
      type: DataTypes.UUID,
      allowNull: false
    },

    unidadMedidaId: {
      type: DataTypes.UUID,
      allowNull: false
    },

    cantidad: {
      type: DataTypes.DECIMAL(15, 3),
      allowNull: false
    },

    lote: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    loteProveedor: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'lote_proveedor'
    },
    fechaVencimiento: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },

    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    tableName: 'detalles_recepcion',
    timestamps: true,
    underscored: true
  }
);

module.exports = DetalleRecepcion;