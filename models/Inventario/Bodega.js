const { DataTypes } = require('sequelize');

const sequelize = require('../../database/database');

const Bodega = sequelize.define(
  'Bodega',
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

    nombre: {
      type: DataTypes.STRING(150),
      allowNull: false
    },

    tipo: {
      type: DataTypes.STRING(50),
      allowNull: false
    },

    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    direccion: {
      type: DataTypes.STRING(250),
      allowNull: true
    },

    responsableId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'responsable_id',
      references: {
        model: 'usuarios',
        key: 'id'
      }
    },

    estado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  },
  {
    tableName: 'bodegas',
    timestamps: true,
    underscored: true
  }
);

module.exports = Bodega;