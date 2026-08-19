const { DataTypes } = require('sequelize');
const sequelize = require('../../database/database');

const Vehiculo = sequelize.define(
  'Vehiculo',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },

    codigo: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },

    placa: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true
    },

    tipoVehiculo: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'tipo_vehiculo'
    },

    marca: {
      type: DataTypes.STRING(80),
      allowNull: true
    },

    modelo: {
      type: DataTypes.STRING(80),
      allowNull: true
    },

    capacidadKg: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'capacidad_kg'
    },

    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    estado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }, proveedorId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'proveedor_id',
      references: {
        model: 'proveedores',
        key: 'id'
      }
    },
  },
  {
    tableName: 'vehiculos',
    timestamps: true,
    underscored: true
  }
);

module.exports = Vehiculo;