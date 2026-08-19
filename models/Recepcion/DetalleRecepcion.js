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
      allowNull: false,
      field: 'recepcion_id',
      references: {
        model: 'recepciones',
        key: 'id'
      }
    },

    productoId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'producto_id',
      references: {
        model: 'productos',
        key: 'id'
      }
    },

    materiaPrimaId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'materia_prima_id',
      references: {
        model: 'materias_primas',
        key: 'id'
      }
    },

    unidadMedida: {
      type: DataTypes.STRING(30),
      allowNull: false,
      field: 'unidad_medida'
    },

    cantidadSolicitada: {
      type: DataTypes.DECIMAL(12, 3),
      allowNull: true,
      field: 'cantidad_solicitada'
    },

    cantidadRecibida: {
      type: DataTypes.DECIMAL(12, 3),
      allowNull: false,
      field: 'cantidad_recibida'
    },

    fechaVencimiento: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'fecha_vencimiento'
    },

    lote: {
      type: DataTypes.STRING(100),
      allowNull: true
    },

    loteProveedor: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'lote_proveedor'
    }
  },
  {
    tableName: 'detalles_recepcion',
    timestamps: true,
    underscored: true
  }
);

module.exports = DetalleRecepcion;