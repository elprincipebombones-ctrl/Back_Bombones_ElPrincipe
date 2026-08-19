const { DataTypes } = require('sequelize');
const definir = require('./definirModelo');

module.exports = definir(
  'OpcionCampo',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    campoFormatoId: { type: DataTypes.UUID, allowNull: false, field: 'campo_formato_id' },
    valor: { type: DataTypes.STRING(100), allowNull: false },
    etiqueta: { type: DataTypes.STRING(150), allowNull: false },
    orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    estado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  'opciones_campo',
);
