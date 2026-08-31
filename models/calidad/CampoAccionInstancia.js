const { DataTypes } = require('sequelize');
const definir = require('./definirModelo');

module.exports = definir(
  'CampoAccionInstancia',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    accionCorrectivaId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'accion_correctiva_id',
    },
    campoAccionCorrectivaId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'campo_accion_correctiva_id',
    },
    codigo: { type: DataTypes.STRING(80), allowNull: false },
    nombre: { type: DataTypes.STRING(200), allowNull: false },
    obligatorio: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    valorTexto: { type: DataTypes.TEXT, allowNull: true, field: 'valor_texto' },
  },
  'campos_accion_instancia',
);
