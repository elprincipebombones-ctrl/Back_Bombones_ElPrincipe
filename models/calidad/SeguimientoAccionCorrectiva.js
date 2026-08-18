const { DataTypes } = require('sequelize');
const definir = require('./definirModelo');

module.exports = definir(
  'SeguimientoAccionCorrectiva',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    accionCorrectivaId: { type: DataTypes.UUID, allowNull: false, field: 'accion_correctiva_id' },
    tipoRegistro: {
      type: DataTypes.ENUM('NUEVA_MEDICION', 'OBSERVACION', 'AJUSTE', 'VERIFICACION'),
      allowNull: false,
      field: 'tipo_registro',
    },
    descripcion: DataTypes.TEXT,
    valorNumero: { type: DataTypes.DECIMAL, field: 'valor_numero' },
    valorTexto: { type: DataTypes.TEXT, field: 'valor_texto' },
    valorBooleano: { type: DataTypes.BOOLEAN, field: 'valor_booleano' },
    unidadMedidaId: { type: DataTypes.UUID, allowNull: true, field: 'unidad_medida_id' },
    resultadoCumple: { type: DataTypes.BOOLEAN, allowNull: true, field: 'resultado_cumple' },
    registradoPor: { type: DataTypes.UUID, allowNull: false, field: 'registrado_por' },
    fechaRegistro: { type: DataTypes.DATE, allowNull: false, field: 'fecha_registro' },
  },
  'seguimientos_accion_correctiva',
);
