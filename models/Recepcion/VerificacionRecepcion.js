const { DataTypes } = require('sequelize');
const sequelize = require('../../database/database');

const VerificacionRecepcion = sequelize.define(
  'VerificacionRecepcion',
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

    certificadoCalidad: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'certificado_calidad'
    },

    plagas: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },

    rotuladoCorrecto: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'rotulado_correcto'
    },

    condicionesEmbalaje: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'condiciones_embalaje'
    },

    aparienciaColorTextura: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'apariencia_color_textura'
    },

    empaqueEmbalaje: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'empaque_embalaje'
    },

    olor: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    }
  },
  {
    tableName: 'verificaciones_recepcion',
    timestamps: true,
    underscored: true
  }
);

module.exports = VerificacionRecepcion;