const { DataTypes } = require('sequelize');
const definir = require('./definirModelo');

module.exports = definir(
  'RespuestaOpcion',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    respuestaInspeccionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'respuesta_inspeccion_id',
    },
    opcionCampoId: { type: DataTypes.UUID, allowNull: false, field: 'opcion_campo_id' },
  },
  'respuestas_opciones',
);
