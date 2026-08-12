const { DataTypes } = require('sequelize');
const definir = require('../calidad/definirModelo');

module.exports = definir(
  'CondicionRegla',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    reglaCalidadId: { type: DataTypes.UUID, allowNull: false, field: 'regla_calidad_id' },
    tipoCondicion: {
      type: DataTypes.ENUM('RANGO', 'VALOR_EXACTO', 'LISTA', 'OBLIGATORIO'),
      allowNull: false,
      field: 'tipo_condicion',
    },
    operador: {
      type: DataTypes.ENUM(
        'IGUAL', 'DIFERENTE', 'MAYOR_QUE', 'MAYOR_IGUAL', 'MENOR_QUE', 'MENOR_IGUAL',
        'ENTRE', 'FUERA_DE_RANGO', 'EN_LISTA', 'NO_EN_LISTA', 'VACIO', 'NO_VACIO',
      ),
      allowNull: false,
    },
    valor1: { type: DataTypes.STRING(255), field: 'valor_1' },
    valor2: { type: DataTypes.STRING(255), field: 'valor_2' },
    valorJson: { type: DataTypes.JSONB, field: 'valor_json' },
    orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    estado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  'condiciones_regla',
);
