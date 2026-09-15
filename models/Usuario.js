const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../database/database');

const Usuario = sequelize.define(
  'Usuario',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    usuario: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      set(value) {
        this.setDataValue(
          'usuario',
          typeof value === 'string' ? value.trim().toLowerCase() : value,
        );
      },
      validate: { is: /^[a-z0-9._-]{3,100}$/ },
    },
    cargoId: { type: DataTypes.UUID, allowNull: true, field: 'cargo_id' },
    correo: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: { isEmail: true },
    },
    password: { type: DataTypes.STRING(255), allowNull: false },
    estado: { type: DataTypes.BOOLEAN, defaultValue: true },
    rolId: { type: DataTypes.UUID, allowNull: false, field: 'rol_id' },
  },
  {
    tableName: 'usuarios',
    timestamps: true,
    defaultScope: { attributes: { exclude: ['password'] } },
    scopes: { withPassword: { attributes: {} } },
    hooks: {
      beforeCreate: async (usuario) => {
        if (usuario.password) {
          usuario.password = await bcrypt.hash(usuario.password, 10);
        }
      },
      beforeUpdate: async (usuario) => {
        if (usuario.changed('password')) {
          usuario.password = await bcrypt.hash(usuario.password, 10);
        }
      },
    },
  },
);

Usuario.prototype.validarPassword = function (password) {
  return bcrypt.compare(password, this.password);
};

module.exports = Usuario;
