const { DataTypes } = require('sequelize');
const definir = require('./definirModelo');

module.exports = definir(
  'EvidenciaAccionCorrectiva',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    accionCorrectivaId: { type: DataTypes.UUID, allowNull: false, field: 'accion_correctiva_id' },
    seguimientoAccionCorrectivaId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'seguimiento_accion_correctiva_id',
    },
    nombreArchivo: { type: DataTypes.STRING(255), allowNull: false, field: 'nombre_archivo' },
    tipoArchivo: { type: DataTypes.STRING(100), allowNull: true, field: 'tipo_archivo' },
    urlArchivo: { type: DataTypes.TEXT, allowNull: false, field: 'url_archivo' },
    descripcion: DataTypes.TEXT,
    subidoPor: { type: DataTypes.UUID, allowNull: false, field: 'subido_por' },
    fechaCarga: { type: DataTypes.DATE, allowNull: false, field: 'fecha_carga' },
  },
  'evidencias_accion_correctiva',
);
