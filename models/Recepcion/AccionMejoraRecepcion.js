const { DataTypes } = require('sequelize');
const sequelize = require('../../database/database');

const AccionMejoraRecepcion = sequelize.define(
  'AccionMejoraRecepcion',
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
    },
    origen: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'VERIFICACION',
      validate: { isIn: [['VERIFICACION', 'TEMPERATURA']] },
    },
    detalleRecepcionId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'detalle_recepcion_id',
    },
    control: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    afectacion: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'RECEPCION_COMPLETA',
      validate: { isIn: [['RECEPCION_COMPLETA', 'PRODUCTO']] },
    },
    observacion: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    decision: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: { isIn: [['RECIBIR', 'NO_RECIBIR']] },
    },
    estado: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'PENDIENTE',
      validate: { isIn: [['PENDIENTE', 'GESTIONADA']] },
    },
  },
  {
    tableName: 'acciones_mejora_recepcion',
    timestamps: true,
    underscored: true,
    indexes: [{ unique: true, fields: ['recepcion_id', 'control'] }],
  },
);

module.exports = AccionMejoraRecepcion;
