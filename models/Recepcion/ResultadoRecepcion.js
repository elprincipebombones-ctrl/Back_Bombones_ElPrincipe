const { DataTypes } = require('sequelize');
const sequelize = require('../../database/database');

const ResultadoRecepcion = sequelize.define(
  'ResultadoRecepcion',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },

    recepcionId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: 'recepcion_id',
      references: {
        model: 'recepciones',
        key: 'id'
      }
    },

    resultado: {
      type: DataTypes.STRING(30),
      allowNull: false
    },

    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    fechaDecision: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'fecha_decision'
    }
  },
  {
    tableName: 'resultados_recepcion',
    timestamps: true,
    underscored: true
  }
);

module.exports = ResultadoRecepcion;