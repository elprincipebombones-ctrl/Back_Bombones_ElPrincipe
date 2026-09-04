const { DataTypes } = require('sequelize');
const sequelize = require('../../database/database');

const Recepcion = sequelize.define(
  'Recepcion',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    numero: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },

    fechaRecepcion: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    proveedorId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'proveedor_id',
      references: {
        model: 'proveedores',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },

    bodegaId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    lugarAreaId: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    estado: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'EN_PROCESO',
      validate: {
        isIn: [['EN_PROCESO', 'TERMINADA']],
      },
    },

    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    usuarioRecepcionId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    tableName: 'recepciones',
    timestamps: true,
    underscored: true,
  },
);

module.exports = Recepcion;
