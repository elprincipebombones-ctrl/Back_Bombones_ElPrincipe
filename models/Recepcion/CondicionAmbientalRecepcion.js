const { DataTypes } = require('sequelize');
const sequelize = require('../../database/database');

const CondicionAmbientalRecepcion = sequelize.define(
  'CondicionAmbientalRecepcion',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    recepcionId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: 'recepcion_id',
      references: {
        model: 'recepciones',
        key: 'id',
      },
    },

    temperatura: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
      field: 'temperatura_cava',
    },

    desinfeccionRealizada: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'desinfeccion_realizada',
    },

    productoDesinfeccion: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: 'desinfectante_area',
    },

    concentracionDesinfeccion: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'concentracion_desinfeccion',
    },

    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'condiciones_ambientales_recepcion',
    timestamps: true,
    underscored: true,
  },
);

module.exports = CondicionAmbientalRecepcion;
