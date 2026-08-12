const fs = require('fs');
const path = require('path');
const sequelize = require('../database/database');

const db = {};
const basename = path.basename(__filename);

const cargarModelos = (directorio) => {
  fs.readdirSync(directorio, { withFileTypes: true }).forEach((entrada) => {
    const ruta = path.join(directorio, entrada.name);
    if (entrada.isDirectory()) return cargarModelos(ruta);
    if (entrada.name === basename || !entrada.name.endsWith('.js')) return;

    const model = require(ruta);
    if (model?.name && model?.tableName) db[model.name] = model;
  });
};

cargarModelos(__dirname);

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

// Calidad: maestros y formatos
db.TipoInspeccion.hasMany(db.FormatoCalidad, {
  foreignKey: 'tipoInspeccionId',
  as: 'formatos',
});
db.FormatoCalidad.belongsTo(db.TipoInspeccion, {
  foreignKey: 'tipoInspeccionId',
  as: 'tipoInspeccion',
});

db.UnidadMedida.hasMany(db.ParametroCalidad, {
  foreignKey: 'unidadMedidaId',
  as: 'parametros',
});
db.ParametroCalidad.belongsTo(db.UnidadMedida, {
  foreignKey: 'unidadMedidaId',
  as: 'unidadMedida',
});

db.FormatoCalidad.hasMany(db.VersionFormato, {
  foreignKey: 'formatoCalidadId',
  as: 'versiones',
});
db.VersionFormato.belongsTo(db.FormatoCalidad, {
  foreignKey: 'formatoCalidadId',
  as: 'formato',
});
db.Usuario.hasMany(db.VersionFormato, { foreignKey: 'publicadoPor', as: 'versionesPublicadas' });
db.VersionFormato.belongsTo(db.Usuario, { foreignKey: 'publicadoPor', as: 'publicador' });

db.VersionFormato.hasMany(db.SeccionFormato, {
  foreignKey: 'versionFormatoId',
  as: 'secciones',
});
db.SeccionFormato.belongsTo(db.VersionFormato, {
  foreignKey: 'versionFormatoId',
  as: 'version',
});

db.SeccionFormato.hasMany(db.CampoFormato, {
  foreignKey: 'seccionFormatoId',
  as: 'campos',
});
db.CampoFormato.belongsTo(db.SeccionFormato, {
  foreignKey: 'seccionFormatoId',
  as: 'seccion',
});
db.ParametroCalidad.hasMany(db.CampoFormato, {
  foreignKey: 'parametroCalidadId',
  as: 'campos',
});
db.CampoFormato.belongsTo(db.ParametroCalidad, {
  foreignKey: 'parametroCalidadId',
  as: 'parametro',
});
db.TipoCampo.hasMany(db.CampoFormato, { foreignKey: 'tipoCampoId', as: 'campos' });
db.CampoFormato.belongsTo(db.TipoCampo, { foreignKey: 'tipoCampoId', as: 'tipoCampo' });
db.UnidadMedida.hasMany(db.CampoFormato, { foreignKey: 'unidadMedidaId', as: 'campos' });
db.CampoFormato.belongsTo(db.UnidadMedida, {
  foreignKey: 'unidadMedidaId',
  as: 'unidadMedida',
});

db.CampoFormato.hasMany(db.OpcionCampo, { foreignKey: 'campoFormatoId', as: 'opciones' });
db.OpcionCampo.belongsTo(db.CampoFormato, { foreignKey: 'campoFormatoId', as: 'campo' });

// Motor de reglas
db.CampoFormato.hasMany(db.ReglaCalidad, { foreignKey: 'campoFormatoId', as: 'reglas' });
db.ReglaCalidad.belongsTo(db.CampoFormato, { foreignKey: 'campoFormatoId', as: 'campo' });
db.NivelSeveridad.hasMany(db.ReglaCalidad, {
  foreignKey: 'nivelSeveridadId',
  as: 'reglas',
});
db.ReglaCalidad.belongsTo(db.NivelSeveridad, {
  foreignKey: 'nivelSeveridadId',
  as: 'nivelSeveridad',
});
db.ReglaCalidad.hasMany(db.CondicionRegla, {
  foreignKey: 'reglaCalidadId',
  as: 'condiciones',
});
db.CondicionRegla.belongsTo(db.ReglaCalidad, {
  foreignKey: 'reglaCalidadId',
  as: 'regla',
});
db.ReglaCalidad.hasMany(db.AccionRegla, {
  foreignKey: 'reglaCalidadId',
  as: 'acciones',
});
db.AccionRegla.belongsTo(db.ReglaCalidad, { foreignKey: 'reglaCalidadId', as: 'regla' });
db.TipoAccion.hasMany(db.AccionRegla, { foreignKey: 'tipoAccionId', as: 'accionesRegla' });
db.AccionRegla.belongsTo(db.TipoAccion, { foreignKey: 'tipoAccionId', as: 'tipoAccion' });

db.sequelize = sequelize;
module.exports = db;
