const { DataTypes } = require('sequelize');
const definir = require('./definirModelo');

module.exports = definir(
  'AprobadorAccionCorrectiva',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    usuarioId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: 'usuario_id',
    },
    agregadoPor: { type: DataTypes.UUID, allowNull: true, field: 'agregado_por' },
    estado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  'aprobadores_acciones_correctivas',
);
