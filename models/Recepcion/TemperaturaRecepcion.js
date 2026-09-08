const { DataTypes } = require('sequelize');
const sequelize = require('../../database/database');

const TemperaturaRecepcion = sequelize.define(
  'TemperaturaRecepcion',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    recepcionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'recepcion_id',
      references: {
        model: 'recepciones',
        key: 'id',
      },
    },

    productoId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'producto_id',
      references: {
        model: 'productos',
        key: 'id',
      },
    },

    detalleRecepcionId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'detalle_recepcion_id',
      references: {
        model: 'detalles_recepcion',
        key: 'id',
      },
    },

    condicionTermica: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'condicion_termica',
      validate: {
        isIn: [['REFRIGERADO', 'CONGELADO']],
      },
    },

    temperatura: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: false,
    },

    hora: {
      type: DataTypes.TIME,
      allowNull: true,
    },

    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'temperaturas_recepcion',
    timestamps: true,
    underscored: true,
  },
);

module.exports = TemperaturaRecepcion;
