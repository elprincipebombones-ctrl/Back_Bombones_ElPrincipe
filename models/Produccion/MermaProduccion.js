const { DataTypes } = require('sequelize');

const sequelize = require('../../database/database');

const MermaProduccion = sequelize.define(
  'MermaProduccion',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    ordenProduccionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'orden_produccion_id',
    },
    tipoMerma: {
      type: DataTypes.STRING(2),
      allowNull: false,
      field: 'tipo_merma',
      validate: { isIn: [['MP', 'PT']] },
    },
    productoId: { type: DataTypes.UUID, allowNull: false, field: 'producto_id' },
    cantidad: {
      type: DataTypes.DECIMAL(18, 6),
      allowNull: false,
      validate: { min: 0.000001 },
    },
    unidadMedidaId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'unidad_medida_id',
    },
    motivoMermaId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'motivo_merma_id',
    },
    observacion: { type: DataTypes.TEXT, allowNull: true },
    usuarioId: { type: DataTypes.UUID, allowNull: false, field: 'usuario_id' },
    fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  { tableName: 'mermas_produccion', timestamps: true, underscored: true },
);

module.exports = MermaProduccion;
