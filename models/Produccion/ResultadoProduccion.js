const { DataTypes } = require('sequelize');

const sequelize = require('../../database/database');

const ResultadoProduccion = sequelize.define(
  'ResultadoProduccion',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    ordenProduccionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'orden_produccion_id',
    },
    productoTerminadoId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'producto_terminado_id',
    },
    cantidadPlaneada: {
      type: DataTypes.DECIMAL(18, 6),
      allowNull: false,
      field: 'cantidad_planeada',
    },
    cantidadProducida: {
      type: DataTypes.DECIMAL(18, 6),
      allowNull: false,
      defaultValue: 0,
      field: 'cantidad_producida',
    },
    unidadMedidaId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'unidad_medida_id',
    },
    lotePt: { type: DataTypes.STRING(30), allowNull: true, unique: true, field: 'lote_pt' },
    fechaVencimientoSugerida: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'fecha_vencimiento_sugerida',
    },
    fechaVencimientoFinal: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'fecha_vencimiento_final',
    },
    bodegaDestinoId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'bodega_destino_id',
    },
  },
  { tableName: 'resultados_produccion', timestamps: true, underscored: true },
);

module.exports = ResultadoProduccion;
