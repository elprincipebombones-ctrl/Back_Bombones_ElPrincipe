const { DataTypes } = require('sequelize');
const sequelize = require('../../database/database');

module.exports = sequelize.define(
  'SolicitudMovimientoOt',
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    ordenProduccionId: { type: DataTypes.UUID, allowNull: false, field: 'orden_produccion_id' },
    tipo: {
      type: DataTypes.STRING(15),
      allowNull: false,
      validate: { isIn: [['ADICIONAL', 'DEVOLUCION']] },
    },
    productoId: { type: DataTypes.UUID, allowNull: false, field: 'producto_id' },
    lote: { type: DataTypes.STRING(100), allowNull: true },
    fechaVencimiento: { type: DataTypes.DATEONLY, allowNull: true, field: 'fecha_vencimiento' },
    cantidad: { type: DataTypes.DECIMAL(18, 6), allowNull: false },
    unidadMedidaId: { type: DataTypes.UUID, allowNull: false, field: 'unidad_medida_id' },
    bodegaOrigenId: { type: DataTypes.UUID, allowNull: false, field: 'bodega_origen_id' },
    bodegaDestinoId: { type: DataTypes.UUID, allowNull: false, field: 'bodega_destino_id' },
    motivo: { type: DataTypes.TEXT, allowNull: false },
    estado: {
      type: DataTypes.STRING(15),
      allowNull: false,
      defaultValue: 'PENDIENTE',
      validate: { isIn: [['PENDIENTE', 'APROBADA', 'RECHAZADA', 'ATENDIDA']] },
    },
    usuarioSolicitaId: { type: DataTypes.UUID, allowNull: false, field: 'usuario_solicita_id' },
    fechaSolicitud: { type: DataTypes.DATE, allowNull: false, field: 'fecha_solicitud' },
    usuarioApruebaId: { type: DataTypes.UUID, allowNull: true, field: 'usuario_aprueba_id' },
    fechaAprobacion: { type: DataTypes.DATE, allowNull: true, field: 'fecha_aprobacion' },
    movimientoSalidaId: { type: DataTypes.UUID, allowNull: true, field: 'movimiento_salida_id' },
    movimientoEntradaId: { type: DataTypes.UUID, allowNull: true, field: 'movimiento_entrada_id' },
    observacionResolucion: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'observacion_resolucion',
    },
  },
  { tableName: 'solicitudes_movimiento_ot', timestamps: true, underscored: true },
);
