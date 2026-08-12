const { DataTypes } = require('sequelize');
const definir = require('./definirModelo');

module.exports = definir(
  'VersionFormato',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    formatoCalidadId: { type: DataTypes.UUID, allowNull: false, field: 'formato_calidad_id' },
    numeroVersion: { type: DataTypes.INTEGER, allowNull: false, field: 'numero_version' },
    fechaVigenciaDesde: { type: DataTypes.DATEONLY, allowNull: false, field: 'fecha_vigencia_desde' },
    fechaVigenciaHasta: { type: DataTypes.DATEONLY, allowNull: true, field: 'fecha_vigencia_hasta' },
    estadoVersion: {
      type: DataTypes.ENUM('BORRADOR', 'PUBLICADO', 'OBSOLETO'),
      allowNull: false,
      defaultValue: 'BORRADOR',
      field: 'estado_version',
    },
    observaciones: DataTypes.TEXT,
    publicadoPor: { type: DataTypes.UUID, allowNull: true, field: 'publicado_por' },
    fechaPublicacion: { type: DataTypes.DATE, allowNull: true, field: 'fecha_publicacion' },
  },
  'versiones_formato',
);
