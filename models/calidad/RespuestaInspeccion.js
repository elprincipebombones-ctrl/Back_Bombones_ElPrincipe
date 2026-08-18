const { DataTypes } = require('sequelize');
const definir = require('./definirModelo');

module.exports = definir(
  'RespuestaInspeccion',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    inspeccionId: { type: DataTypes.UUID, allowNull: false, field: 'inspeccion_id' },
    campoFormatoId: { type: DataTypes.UUID, allowNull: false, field: 'campo_formato_id' },
    valorTexto: { type: DataTypes.TEXT, field: 'valor_texto' },
    valorNumero: { type: DataTypes.DECIMAL, field: 'valor_numero' },
    valorBooleano: { type: DataTypes.BOOLEAN, field: 'valor_booleano' },
    valorFecha: { type: DataTypes.DATEONLY, field: 'valor_fecha' },
    valorHora: { type: DataTypes.TIME, field: 'valor_hora' },
    valorFechaHora: { type: DataTypes.DATE, field: 'valor_fecha_hora' },
    valorJson: { type: DataTypes.JSONB, field: 'valor_json' },
    observacion: DataTypes.TEXT,
    guardadoPor: { type: DataTypes.UUID, allowNull: false, field: 'guardado_por' },
    fechaGuardado: { type: DataTypes.DATE, allowNull: false, field: 'fecha_guardado' },
    bloqueada: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  'respuestas_inspeccion',
);
