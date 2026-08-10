const fs = require('fs');
const path = require('path');
const sequelize = require('../database/database');

const db = {};
const basename = path.basename(__filename);

fs.readdirSync(__dirname)
  .filter((file) => file !== basename && file.endsWith('.js'))
  .forEach((file) => {
    const model = require(path.join(__dirname, file));
    if (model && model.name) {
      db[model.name] = model;
    }
  });

// Asociaciones
// Usuario - Rol
db.Rol.hasMany(db.Usuario, { foreignKey: 'rolId', as: 'usuarios' });
db.Usuario.belongsTo(db.Rol, { foreignKey: 'rolId', as: 'rol' });

// Rol - Permiso (N:M)
db.Rol.belongsToMany(db.Permiso, {
  through: db.RolPermiso,
  foreignKey: 'rolId',
  otherKey: 'permisoId',
  as: 'permisos',
});
db.Permiso.belongsToMany(db.Rol, {
  through: db.RolPermiso,
  foreignKey: 'permisoId',
  otherKey: 'rolId',
  as: 'roles',
});

// Rol - Menu (N:M)
db.Rol.belongsToMany(db.Menu, {
  through: db.RolMenu,
  foreignKey: 'rolId',
  otherKey: 'menuId',
  as: 'menus',
});
db.Menu.belongsToMany(db.Rol, {
  through: db.RolMenu,
  foreignKey: 'menuId',
  otherKey: 'rolId',
  as: 'roles',
});

db.sequelize = sequelize;
module.exports = db;
