const fs = require('fs');
const path = require('path');
const sequelize = require('../database/database');

const db = {};
const basename = path.basename(__filename);
fs.readdirSync(__dirname)
  .filter(file => file !== basename && file.endsWith('.js'))
  .forEach(file => {
    const model = require(path.join(__dirname, file));

    if (model && model.name) {
      db[model.name] = model;
    }
  });

const Proveedor = require('./Recepcion/Proveedor');
const Producto = require('./Recepcion/Producto');
const MateriaPrima = require('./Recepcion/MateriaPrima');
const LugarArea = require('./Recepcion/LugarArea');
const Vehiculo = require('./Recepcion/Vehiculo');

db.Proveedor = Proveedor;
db.Producto = Producto;
db.MateriaPrima = MateriaPrima;
db.LugarArea = LugarArea;
db.Vehiculo = Vehiculo;
// ==========================================
// Usuario - Rol
// ==========================================

db.Rol.hasMany(db.Usuario, {
  foreignKey: 'rolId',
  as: 'usuarios'
});

db.Usuario.belongsTo(db.Rol, {
  foreignKey: 'rolId',
  as: 'rol'
});
console.log(Object.keys(db));


// ==========================================
// Rol - Permiso
// ==========================================

db.Rol.belongsToMany(db.Permiso, {
  through: db.RolPermiso,
  foreignKey: 'rolId',
  otherKey: 'permisoId',
  as: 'permisos'
});

db.Permiso.belongsToMany(db.Rol, {
  through: db.RolPermiso,
  foreignKey: 'permisoId',
  otherKey: 'rolId',
  as: 'roles'
});


// ==========================================
// Rol - Menú
// ==========================================

db.Rol.belongsToMany(db.Menu, {
  through: db.RolMenu,
  foreignKey: 'rolId',
  otherKey: 'menuId',
  as: 'menus'
});

db.Menu.belongsToMany(db.Rol, {
  through: db.RolMenu,
  foreignKey: 'menuId',
  otherKey: 'rolId',
  as: 'roles'
});


// ==========================================
// Proveedor - Vehículo
// ==========================================

db.Proveedor.hasMany(db.Vehiculo, {
  foreignKey: 'proveedorId',
  as: 'vehiculos'
});

db.Vehiculo.belongsTo(db.Proveedor, {
  foreignKey: 'proveedorId',
  as: 'proveedor'
});


// ==========================================

db.sequelize = sequelize;

module.exports = db;