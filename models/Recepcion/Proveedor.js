const { DataTypes } = require('sequelize');
const sequelize = require('../../database/database');

const Proveedor = sequelize.define(
  'Proveedor',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    tipoDocumento: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'tipo_documento',
    },

    numeroDocumento: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
      field: 'numero_documento',
    },

    razonSocial: {
      type: DataTypes.STRING(200),
      allowNull: true,
      field: 'razon_social',
    },

    nombreComercial: {
      type: DataTypes.STRING(200),
      allowNull: true,
      field: 'nombre_comercial',
    },

    telefono: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },

    nombreContactoTelefono: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: 'nombre_contacto_telefono',
    },

    email: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },

    emailFacturacionElectronica: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: 'email_facturacion_electronica',
    },

    direccion: {
      type: DataTypes.STRING(250),
      allowNull: true,
    },

    ciudad: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    estado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    esCliente: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'es_cliente',
    },

    esProveedor: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'es_proveedor',
    },
  },
  {
    tableName: 'proveedores',
    timestamps: true,
    underscored: true,
  },
);

module.exports = Proveedor;
