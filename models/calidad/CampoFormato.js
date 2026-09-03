const { DataTypes } = require('sequelize');
const definir = require('./definirModelo');

module.exports = definir(
  'CampoFormato',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    seccionFormatoId: { type: DataTypes.UUID, allowNull: false, field: 'seccion_formato_id' },
    parametroCalidadId: { type: DataTypes.UUID, allowNull: true, field: 'parametro_calidad_id' },
    tipoCampoId: { type: DataTypes.UUID, allowNull: false, field: 'tipo_campo_id' },
    unidadMedidaId: { type: DataTypes.UUID, allowNull: true, field: 'unidad_medida_id' },
    codigo: { type: DataTypes.STRING(30), allowNull: false },
    etiqueta: { type: DataTypes.STRING(150), allowNull: false },
    descripcion: DataTypes.STRING(255),
    textoAyuda: { type: DataTypes.STRING(255), field: 'texto_ayuda' },
    esObligatorio: { type: DataTypes.BOOLEAN, field: 'es_obligatorio', defaultValue: false },
    orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    valorMinimo: { type: DataTypes.DECIMAL, allowNull: true, field: 'valor_minimo' },
    valorMaximo: { type: DataTypes.DECIMAL, allowNull: true, field: 'valor_maximo' },
    precisionDecimal: { type: DataTypes.INTEGER, allowNull: true, field: 'precision_decimal' },
    permiteObservacion: {
      type: DataTypes.BOOLEAN,
      field: 'permite_observacion',
      defaultValue: true,
    },
    requiereEvidencia: {
      type: DataTypes.BOOLEAN,
      field: 'requiere_evidencia',
      defaultValue: false,
    },
    bloquearAlGuardar: {
      type: DataTypes.BOOLEAN,
      field: 'bloquear_al_guardar',
      defaultValue: false,
    },
    estado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  'campos_formato',
);
