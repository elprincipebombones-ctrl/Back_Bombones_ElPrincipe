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
const CategoriaProducto = require('./Recepcion/CategoriaProducto');
const DetalleRecepcion = require('./Recepcion/DetalleRecepcion');
const Recepcion = require('./Recepcion/Recepcion');
const RecepcionVehiculo = require('./Recepcion/RecepcionVehiculo');
const VerificacionRecepcion = require('./Recepcion/VerificacionRecepcion');
const TemperaturaRecepcion = require('./Recepcion/TemperaturaRecepcion');
const CondicionAmbientalRecepcion = require('./Recepcion/CondicionAmbientalRecepcion');
const ResultadoRecepcion = require('./Recepcion/ResultadoRecepcion');




db.Proveedor = Proveedor;
db.Producto = Producto;
db.MateriaPrima = MateriaPrima;
db.LugarArea = LugarArea;
db.Vehiculo = Vehiculo;
db.CategoriaProducto = CategoriaProducto;
db.RecepcionVehiculo = RecepcionVehiculo;
db.VerificacionRecepcion = VerificacionRecepcion;
db.TemperaturaRecepcion = TemperaturaRecepcion;
db.CondicionAmbientalRecepcion = CondicionAmbientalRecepcion;
db.ResultadoRecepcion = ResultadoRecepcion;
db.DetalleRecepcion = DetalleRecepcion;
 db.Recepcion = Recepcion;
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
db.CategoriaProducto.hasMany(db.Producto, {
  foreignKey: 'categoriaProductoId',
  as: 'productos'
});

db.Producto.belongsTo(db.CategoriaProducto, {
  foreignKey: 'categoriaProductoId',
  as: 'categoriaProducto'
});
// ==========================================

db.MateriaPrima.hasMany(db.DetalleRecepcion, {
  foreignKey: 'materiaPrimaId',
  as: 'detallesRecepcion'
});

db.DetalleRecepcion.belongsTo(db.MateriaPrima, {
  foreignKey: 'materiaPrimaId',
  as: 'materiaPrima'
});

// ==========================================
// Usuario - Recepción
// ==========================================

db.Usuario.hasMany(db.Recepcion, {
  foreignKey: 'usuarioRecepcionId',
  as: 'recepcionesRealizadas'
});

db.Recepcion.belongsTo(db.Usuario, {
  foreignKey: 'usuarioRecepcionId',
  as: 'usuarioRecepcion'
});


// ==========================================
// Usuario - Verificación de Recepción
// ==========================================

db.Usuario.hasMany(db.Recepcion, {
  foreignKey: 'usuarioVerificacionId',
  as: 'recepcionesVerificadas'
});

db.Recepcion.belongsTo(db.Usuario, {
  foreignKey: 'usuarioVerificacionId',
  as: 'usuarioVerificacion'
});


// ==========================================
// Usuario - Resultado de Recepción
// ==========================================

db.Usuario.hasMany(db.ResultadoRecepcion, {
  foreignKey: 'usuarioDecisionId',
  as: 'resultadosRecepcion'
});

db.ResultadoRecepcion.belongsTo(db.Usuario, {
  foreignKey: 'usuarioDecisionId',
  as: 'usuarioDecision'
});


// ==========================================
// Recepción - Vehículo
// ==========================================

db.Recepcion.hasMany(db.RecepcionVehiculo, {
  foreignKey: 'recepcionId',
  as: 'vehiculos',
  onDelete: 'CASCADE'
});

db.RecepcionVehiculo.belongsTo(db.Recepcion, {
  foreignKey: 'recepcionId',
  as: 'recepcion'
});


// ==========================================
// Vehículo - Recepción
// ==========================================

db.Vehiculo.hasMany(db.RecepcionVehiculo, {
  foreignKey: 'vehiculoId',
  as: 'recepciones'
});

db.RecepcionVehiculo.belongsTo(db.Vehiculo, {
  foreignKey: 'vehiculoId',
  as: 'vehiculo'
});

// ==========================================
// Recepción - Verificación de Recepción
// ==========================================

db.Recepcion.hasOne(db.VerificacionRecepcion, {
  foreignKey: 'recepcionId',
  as: 'verificacionRecepcion',
  onDelete: 'CASCADE'
});

db.VerificacionRecepcion.belongsTo(db.Recepcion, {
  foreignKey: 'recepcionId',
  as: 'recepcion'
});

// ==========================================
// Recepción - Temperaturas
// ==========================================

db.Recepcion.hasMany(db.TemperaturaRecepcion, {
  foreignKey: 'recepcionId',
  as: 'temperaturas',
  onDelete: 'CASCADE'
});

db.TemperaturaRecepcion.belongsTo(db.Recepcion, {
  foreignKey: 'recepcionId',
  as: 'recepcion'
});


// ==========================================
// Producto - Temperaturas de Recepción
// ==========================================

db.Producto.hasMany(db.TemperaturaRecepcion, {
  foreignKey: 'productoId',
  as: 'temperaturasRecepcion'
});

db.TemperaturaRecepcion.belongsTo(db.Producto, {
  foreignKey: 'productoId',
  as: 'producto'
});

// ==========================================
// Recepción - Condiciones Ambientales
// ==========================================

db.Recepcion.hasOne(db.CondicionAmbientalRecepcion, {
  foreignKey: 'recepcionId',
  as: 'condicionAmbiental',
  onDelete: 'CASCADE'
});

db.CondicionAmbientalRecepcion.belongsTo(db.Recepcion, {
  foreignKey: 'recepcionId',
  as: 'recepcion'
});

// ==========================================
// Recepción - Resultado
// ==========================================

db.Recepcion.hasOne(db.ResultadoRecepcion, {
  foreignKey: 'recepcionId',
  as: 'resultadoRecepcion',
  onDelete: 'CASCADE'
});

db.ResultadoRecepcion.belongsTo(db.Recepcion, {
  foreignKey: 'recepcionId',
  as: 'recepcion'
});

// ==========================================
// Recepción - Detalles
// ==========================================

db.Recepcion.hasMany(db.DetalleRecepcion, {
  foreignKey: 'recepcionId',
  as: 'detalles',
  onDelete: 'CASCADE'
});

db.DetalleRecepcion.belongsTo(db.Recepcion, {
  foreignKey: 'recepcionId',
  as: 'recepcion'
});

// ==========================================
// Producto - Detalles de Recepción
// ==========================================

db.Producto.hasMany(db.DetalleRecepcion, {
  foreignKey: 'productoId',
  as: 'detallesRecepcion'
});

db.DetalleRecepcion.belongsTo(db.Producto, {
  foreignKey: 'productoId',
  as: 'producto'
});

db.sequelize = sequelize;

module.exports = db;