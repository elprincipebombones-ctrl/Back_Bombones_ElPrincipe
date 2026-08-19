const { DataTypes } = require('sequelize');
const sequelize = require('../../database/database');

const RecepcionVehiculo = sequelize.define(
  'RecepcionVehiculo',
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

    vehiculoId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'vehiculo_id',
      references: {
        model: 'vehiculos',
        key: 'id'
      }
    },

    temperatura: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true
    },

    precinto: {
      type: DataTypes.STRING(100),
      allowNull: true
    },

    guiaTransporte: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'guia_transporte'
    },

    hora: {
      type: DataTypes.TIME,
      allowNull: true
    },

    vehiculoConductorOk: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'vehiculo_conductor_ok'
    }
  },
  {
    tableName: 'recepciones_vehiculos',
    timestamps: true,
    underscored: true
  }
);

module.exports = RecepcionVehiculo;