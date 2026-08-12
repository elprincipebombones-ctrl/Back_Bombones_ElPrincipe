const { DataTypes } = require('sequelize');
const definir = require('../calidad/definirModelo');

module.exports = definir(
  'AccionRegla',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    reglaCalidadId: { type: DataTypes.UUID, allowNull: false, field: 'regla_calidad_id' },
    tipoAccionId: { type: DataTypes.UUID, allowNull: false, field: 'tipo_accion_id' },
    configuracion: DataTypes.JSONB,
    orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    estado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  'acciones_regla',
);
