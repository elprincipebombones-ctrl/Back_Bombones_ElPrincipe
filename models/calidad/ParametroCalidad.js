const { DataTypes } = require('sequelize');
const definir = require('./definirModelo');

module.exports = definir(
  'ParametroCalidad',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    codigo: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    descripcion: DataTypes.STRING(255),
    tipoCampoId: { type: DataTypes.UUID, allowNull: true, field: 'tipo_campo_id' },
    unidadMedidaId: { type: DataTypes.UUID, allowNull: true, field: 'unidad_medida_id' },
    valorMinimo: { type: DataTypes.DECIMAL, allowNull: true, field: 'valor_minimo' },
    valorMaximo: { type: DataTypes.DECIMAL, allowNull: true, field: 'valor_maximo' },
    precisionDecimal: { type: DataTypes.INTEGER, allowNull: true, field: 'precision_decimal' },
    esObligatorioDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'es_obligatorio_default' },
    permiteObservacionDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'permite_observacion_default' },
    requiereEvidenciaDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'requiere_evidencia_default' },
    bloquearAlGuardarDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'bloquear_al_guardar_default' },
    estado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  'parametros_calidad',
);
