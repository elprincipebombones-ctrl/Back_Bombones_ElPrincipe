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
const Bodega = require('./Inventario/Bodega');
const Usuario = require('./Usuario');
const UnidadMedida = require('./Recepcion/UnidadMedida');



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
db.Bodega = Bodega;
db.UnidadMedida = UnidadMedida;
// ==========================================
// Usuario - Rol
// ==========================================

db.Rol.hasMany(db.Usuario, {
  foreignKey: 'rolId',
  as: 'usuarios',
});

db.Usuario.belongsTo(db.Rol, {
  foreignKey: 'rolId',
  as: 'rol',
});
console.log(Object.keys(db));

// ==========================================
// Rol - Permiso
// ==========================================

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

// ==========================================
// Rol - Menú
// ==========================================

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

// ==========================================
// Proveedor - Vehículo
// ==========================================

db.Proveedor.hasMany(db.Vehiculo, {
  foreignKey: 'proveedorId',
  as: 'vehiculos',
});

db.Vehiculo.belongsTo(db.Proveedor, {
  foreignKey: 'proveedorId',
  as: 'proveedor',
});

// ==========================================
db.CategoriaProducto.hasMany(db.Producto, {
  foreignKey: 'categoriaProductoId',
  as: 'productos',
});

db.Producto.belongsTo(db.CategoriaProducto, {
  foreignKey: 'categoriaProductoId',
  as: 'categoriaProducto',
});

db.Producto.belongsTo(UnidadMedida, {
  foreignKey: 'unidadMedidaId',
  as: 'unidadMedida'
});

db.UnidadMedida.hasMany(db.Producto, {
  foreignKey: 'unidadMedidaId',
  as: 'productos'
});

db.UnidadMedida.hasMany(db.DetalleRecepcion, {
  foreignKey: 'unidadMedidaId',
  as: 'detallesRecepcion'
});

db.DetalleRecepcion.belongsTo(db.UnidadMedida, {
  foreignKey: 'unidadMedidaId',
  as: 'unidadMedida'
});
// ==========================================
// Usuario - Recepción
// ==========================================

db.Usuario.hasMany(db.Recepcion, {
  foreignKey: 'usuarioRecepcionId',
  as: 'recepcionesRealizadas',
});

db.Recepcion.belongsTo(db.Usuario, {
  foreignKey: 'usuarioRecepcionId',
  as: 'usuarioRecepcion',
});

// ==========================================
// Usuario - Verificación de Recepción
// ==========================================

db.Usuario.hasMany(db.Recepcion, {
  foreignKey: 'usuarioVerificacionId',
  as: 'recepcionesVerificadas',
});

db.Recepcion.belongsTo(db.Usuario, {
  foreignKey: 'usuarioVerificacionId',
  as: 'usuarioVerificacion',
});

// ==========================================
// Usuario - Resultado de Recepción
// ==========================================

db.Usuario.hasMany(db.ResultadoRecepcion, {
  foreignKey: 'usuarioDecisionId',
  as: 'resultadosRecepcion',
});

db.ResultadoRecepcion.belongsTo(db.Usuario, {
  foreignKey: 'usuarioDecisionId',
  as: 'usuarioDecision',
});

// ==========================================
// Recepción - Vehículo
// ==========================================

db.Recepcion.hasMany(db.RecepcionVehiculo, {
  foreignKey: 'recepcionId',
  as: 'vehiculos',
  onDelete: 'CASCADE',
});

db.RecepcionVehiculo.belongsTo(db.Recepcion, {
  foreignKey: 'recepcionId',
  as: 'recepcion',
});

// ==========================================
// Vehículo - Recepción
// ==========================================

db.Vehiculo.hasMany(db.RecepcionVehiculo, {
  foreignKey: 'vehiculoId',
  as: 'recepciones',
});

db.RecepcionVehiculo.belongsTo(db.Vehiculo, {
  foreignKey: 'vehiculoId',
  as: 'vehiculo',
});

// ==========================================
// Recepción - Verificación de Recepción
// ==========================================

db.Recepcion.hasOne(db.VerificacionRecepcion, {
  foreignKey: 'recepcionId',
  as: 'verificacionRecepcion',
  onDelete: 'CASCADE',
});

db.VerificacionRecepcion.belongsTo(db.Recepcion, {
  foreignKey: 'recepcionId',
  as: 'recepcion',
});

// ==========================================
// Recepción - Temperaturas
// ==========================================

db.Recepcion.hasMany(db.TemperaturaRecepcion, {
  foreignKey: 'recepcionId',
  as: 'temperaturas',
  onDelete: 'CASCADE',
});

db.TemperaturaRecepcion.belongsTo(db.Recepcion, {
  foreignKey: 'recepcionId',
  as: 'recepcion',
});

// ==========================================
// Producto - Temperaturas de Recepción
// ==========================================

db.Producto.hasMany(db.TemperaturaRecepcion, {
  foreignKey: 'productoId',
  as: 'temperaturasRecepcion',
});

db.TemperaturaRecepcion.belongsTo(db.Producto, {
  foreignKey: 'productoId',
  as: 'producto',
});

// ==========================================
// Recepción - Condiciones Ambientales
// ==========================================

db.Recepcion.hasOne(db.CondicionAmbientalRecepcion, {
  foreignKey: 'recepcionId',
  as: 'condicionAmbiental',
  onDelete: 'CASCADE',
});

db.CondicionAmbientalRecepcion.belongsTo(db.Recepcion, {
  foreignKey: 'recepcionId',
  as: 'recepcion',
});

// ==========================================
// Recepción - Resultado
// ==========================================

db.Recepcion.hasOne(db.ResultadoRecepcion, {
  foreignKey: 'recepcionId',
  as: 'resultadoRecepcion',
  onDelete: 'CASCADE',
});

db.ResultadoRecepcion.belongsTo(db.Recepcion, {
  foreignKey: 'recepcionId',
  as: 'recepcion',
});

// ==========================================
// Recepción - Detalles
// ==========================================

db.Recepcion.hasMany(db.DetalleRecepcion, {
  foreignKey: 'recepcionId',
  as: 'detalles',
  onDelete: 'CASCADE',
});

db.DetalleRecepcion.belongsTo(db.Recepcion, {
  foreignKey: 'recepcionId',
  as: 'recepcion',
});

// ==========================================
// Producto - Detalles de Recepción
// ==========================================

db.Producto.hasMany(db.DetalleRecepcion, {
  foreignKey: 'productoId',
  as: 'detallesRecepcion',
});

db.DetalleRecepcion.belongsTo(db.Producto, {
  foreignKey: 'productoId',
  as: 'producto',
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
db.ProgramaCalidad.hasMany(db.FormatoCalidad, {
  foreignKey: 'programaId',
  as: 'formatos',
});
db.FormatoCalidad.belongsTo(db.ProgramaCalidad, {
  foreignKey: 'programaId',
  as: 'programa',
});

db.FormatoCalidad.hasMany(db.ProgramacionFormato, {
  foreignKey: 'formatoCalidadId',
  as: 'programaciones',
});
db.ProgramacionFormato.belongsTo(db.FormatoCalidad, {
  foreignKey: 'formatoCalidadId',
  as: 'formato',
});
db.ProgramacionFormato.hasMany(db.DiaProgramacion, {
  foreignKey: 'programacionFormatoId',
  as: 'dias',
  onDelete: 'CASCADE',
});
db.DiaProgramacion.belongsTo(db.ProgramacionFormato, {
  foreignKey: 'programacionFormatoId',
  as: 'programacion',
});

db.UnidadMedida.hasMany(db.ParametroCalidad, {
  foreignKey: 'unidadMedidaId',
  as: 'parametros',
});
db.ParametroCalidad.belongsTo(db.UnidadMedida, {
  foreignKey: 'unidadMedidaId',
  as: 'unidadMedida',
});
db.TipoCampo.hasMany(db.ParametroCalidad, { foreignKey: 'tipoCampoId', as: 'parametros' });
db.ParametroCalidad.belongsTo(db.TipoCampo, { foreignKey: 'tipoCampoId', as: 'tipoCampo' });

db.ParametroCalidad.hasMany(db.ParametroCampoAccion, {
  foreignKey: 'parametroCalidadId',
  as: 'camposAccion',
});
db.ParametroCampoAccion.belongsTo(db.ParametroCalidad, {
  foreignKey: 'parametroCalidadId',
  as: 'parametro',
});
db.CampoAccionCorrectiva.hasMany(db.ParametroCampoAccion, {
  foreignKey: 'campoAccionCorrectivaId',
  as: 'parametrosAsignados',
});
db.ParametroCampoAccion.belongsTo(db.CampoAccionCorrectiva, {
  foreignKey: 'campoAccionCorrectivaId',
  as: 'campo',
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

// Calidad: catálogos y plantillas de checklist reutilizables
db.CategoriaElemento.hasMany(db.ElementoInspeccion, {
  foreignKey: 'categoriaElementoId',
  as: 'elementos',
});
db.ElementoInspeccion.belongsTo(db.CategoriaElemento, {
  foreignKey: 'categoriaElementoId',
  as: 'categoria',
});
db.TipoCampo.hasMany(db.CriterioInspeccion, {
  foreignKey: 'tipoCampoId',
  as: 'criterios',
});
db.CriterioInspeccion.belongsTo(db.TipoCampo, {
  foreignKey: 'tipoCampoId',
  as: 'tipoCampo',
});
db.NivelSeveridad.hasMany(db.CriterioInspeccion, {
  foreignKey: 'nivelSeveridadId',
  as: 'criterios',
});
db.CriterioInspeccion.belongsTo(db.NivelSeveridad, {
  foreignKey: 'nivelSeveridadId',
  as: 'nivelSeveridad',
});
db.CriterioInspeccion.hasMany(db.AccionCriterio, {
  foreignKey: 'criterioInspeccionId',
  as: 'acciones',
});
db.AccionCriterio.belongsTo(db.CriterioInspeccion, {
  foreignKey: 'criterioInspeccionId',
  as: 'criterio',
});
db.TipoAccion.hasMany(db.AccionCriterio, {
  foreignKey: 'tipoAccionId',
  as: 'accionesCriterio',
});
db.AccionCriterio.belongsTo(db.TipoAccion, {
  foreignKey: 'tipoAccionId',
  as: 'tipoAccion',
});
db.SeccionFormato.hasMany(db.ChecklistSeccion, {
  foreignKey: 'seccionFormatoId',
  as: 'checklists',
});
db.ChecklistSeccion.belongsTo(db.SeccionFormato, {
  foreignKey: 'seccionFormatoId',
  as: 'seccion',
});
db.CriterioInspeccion.hasMany(db.ChecklistSeccion, {
  foreignKey: 'criterioInspeccionId',
  as: 'checklists',
});
db.ChecklistSeccion.belongsTo(db.CriterioInspeccion, {
  foreignKey: 'criterioInspeccionId',
  as: 'criterio',
});
db.ChecklistSeccion.hasMany(db.ElementoChecklist, {
  foreignKey: 'checklistSeccionId',
  as: 'elementos',
});
db.ElementoChecklist.belongsTo(db.ChecklistSeccion, {
  foreignKey: 'checklistSeccionId',
  as: 'checklist',
});
db.ElementoInspeccion.hasMany(db.ElementoChecklist, {
  foreignKey: 'elementoInspeccionId',
  as: 'seleccionesChecklist',
});
db.ElementoChecklist.belongsTo(db.ElementoInspeccion, {
  foreignKey: 'elementoInspeccionId',
  as: 'elemento',
});

// Motor de reglas
db.CampoFormato.hasMany(db.ReglaCalidad, { foreignKey: 'campoFormatoId', as: 'reglas' });
db.ReglaCalidad.belongsTo(db.CampoFormato, { foreignKey: 'campoFormatoId', as: 'campo' });
db.ParametroCalidad.hasMany(db.ReglaCalidad, { foreignKey: 'parametroCalidadId', as: 'reglas' });
db.ReglaCalidad.belongsTo(db.ParametroCalidad, {
  foreignKey: 'parametroCalidadId',
  as: 'parametro',
});
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

// Ejecución de inspecciones
db.CategoriaLugarInspeccion.hasMany(db.LugarInspeccion, {
  foreignKey: 'categoriaLugarInspeccionId',
  as: 'lugares',
});
db.LugarInspeccion.belongsTo(db.CategoriaLugarInspeccion, {
  foreignKey: 'categoriaLugarInspeccionId',
  as: 'categoria',
});
db.VersionFormato.hasMany(db.Inspeccion, { foreignKey: 'versionFormatoId', as: 'inspecciones' });
db.Inspeccion.belongsTo(db.VersionFormato, { foreignKey: 'versionFormatoId', as: 'version' });
db.LugarInspeccion.hasMany(db.Inspeccion, {
  foreignKey: 'lugarInspeccionId',
  as: 'inspecciones',
});
db.Inspeccion.belongsTo(db.LugarInspeccion, {
  foreignKey: 'lugarInspeccionId',
  as: 'lugarInspeccion',
});
db.Usuario.hasMany(db.Inspeccion, { foreignKey: 'iniciadaPor', as: 'inspeccionesIniciadas' });
db.Inspeccion.belongsTo(db.Usuario, { foreignKey: 'iniciadaPor', as: 'iniciador' });
db.Usuario.hasMany(db.Inspeccion, { foreignKey: 'cerradaPor', as: 'inspeccionesCerradas' });
db.Inspeccion.belongsTo(db.Usuario, { foreignKey: 'cerradaPor', as: 'cerrador' });

db.Inspeccion.hasMany(db.RespuestaInspeccion, {
  foreignKey: 'inspeccionId',
  as: 'respuestas',
});
db.RespuestaInspeccion.belongsTo(db.Inspeccion, {
  foreignKey: 'inspeccionId',
  as: 'inspeccion',
});
db.CampoFormato.hasMany(db.RespuestaInspeccion, {
  foreignKey: 'campoFormatoId',
  as: 'respuestas',
});
db.RespuestaInspeccion.belongsTo(db.CampoFormato, {
  foreignKey: 'campoFormatoId',
  as: 'campo',
});
db.Usuario.hasMany(db.RespuestaInspeccion, {
  foreignKey: 'guardadoPor',
  as: 'respuestasGuardadas',
});
db.RespuestaInspeccion.belongsTo(db.Usuario, {
  foreignKey: 'guardadoPor',
  as: 'guardadoPorUsuario',
});

db.Inspeccion.hasMany(db.RespuestaElementoChecklist, {
  foreignKey: 'inspeccionId',
  as: 'respuestasChecklist',
});
db.RespuestaElementoChecklist.belongsTo(db.Inspeccion, {
  foreignKey: 'inspeccionId',
  as: 'inspeccion',
});
db.ChecklistSeccion.hasMany(db.RespuestaElementoChecklist, {
  foreignKey: 'checklistSeccionId',
  as: 'respuestas',
});
db.RespuestaElementoChecklist.belongsTo(db.ChecklistSeccion, {
  foreignKey: 'checklistSeccionId',
  as: 'checklist',
});
db.ElementoChecklist.hasMany(db.RespuestaElementoChecklist, {
  foreignKey: 'elementoChecklistId',
  as: 'respuestas',
});
db.RespuestaElementoChecklist.belongsTo(db.ElementoChecklist, {
  foreignKey: 'elementoChecklistId',
  as: 'seleccion',
});
db.ElementoInspeccion.hasMany(db.RespuestaElementoChecklist, {
  foreignKey: 'elementoInspeccionId',
  as: 'respuestas',
});
db.RespuestaElementoChecklist.belongsTo(db.ElementoInspeccion, {
  foreignKey: 'elementoInspeccionId',
  as: 'elemento',
});
db.CriterioInspeccion.hasMany(db.RespuestaElementoChecklist, {
  foreignKey: 'criterioInspeccionId',
  as: 'respuestas',
});
db.RespuestaElementoChecklist.belongsTo(db.CriterioInspeccion, {
  foreignKey: 'criterioInspeccionId',
  as: 'criterio',
});
db.Usuario.hasMany(db.RespuestaElementoChecklist, {
  foreignKey: 'guardadoPor',
  as: 'respuestasChecklistGuardadas',
});
db.RespuestaElementoChecklist.belongsTo(db.Usuario, {
  foreignKey: 'guardadoPor',
  as: 'guardadoPorUsuario',
});

db.RespuestaInspeccion.hasMany(db.RespuestaOpcion, {
  foreignKey: 'respuestaInspeccionId',
  as: 'opcionesSeleccionadas',
});
db.RespuestaOpcion.belongsTo(db.RespuestaInspeccion, {
  foreignKey: 'respuestaInspeccionId',
  as: 'respuesta',
});
db.OpcionCampo.hasMany(db.RespuestaOpcion, {
  foreignKey: 'opcionCampoId',
  as: 'selecciones',
});
db.RespuestaOpcion.belongsTo(db.OpcionCampo, { foreignKey: 'opcionCampoId', as: 'opcion' });

db.Inspeccion.hasMany(db.Desviacion, { foreignKey: 'inspeccionId', as: 'desviaciones' });
db.Desviacion.belongsTo(db.Inspeccion, { foreignKey: 'inspeccionId', as: 'inspeccion' });
db.RespuestaInspeccion.hasMany(db.Desviacion, {
  foreignKey: 'respuestaInspeccionId',
  as: 'desviaciones',
});
db.Desviacion.belongsTo(db.RespuestaInspeccion, {
  foreignKey: 'respuestaInspeccionId',
  as: 'respuesta',
});
db.CriterioInspeccion.hasMany(db.CriterioCampoAccion, {
  foreignKey: 'criterioInspeccionId',
  as: 'camposAccion',
});
db.CriterioCampoAccion.belongsTo(db.CriterioInspeccion, {
  foreignKey: 'criterioInspeccionId',
  as: 'criterio',
});
db.CampoAccionCorrectiva.hasMany(db.CriterioCampoAccion, {
  foreignKey: 'campoAccionCorrectivaId',
  as: 'criteriosAsignados',
});
db.CriterioCampoAccion.belongsTo(db.CampoAccionCorrectiva, {
  foreignKey: 'campoAccionCorrectivaId',
  as: 'campo',
});
db.RespuestaElementoChecklist.hasOne(db.Desviacion, {
  foreignKey: 'respuestaElementoChecklistId',
  as: 'desviacion',
});
db.Desviacion.belongsTo(db.RespuestaElementoChecklist, {
  foreignKey: 'respuestaElementoChecklistId',
  as: 'respuestaChecklist',
});
db.ReglaCalidad.hasMany(db.Desviacion, { foreignKey: 'reglaCalidadId', as: 'desviaciones' });
db.Desviacion.belongsTo(db.ReglaCalidad, { foreignKey: 'reglaCalidadId', as: 'regla' });
db.NivelSeveridad.hasMany(db.Desviacion, {
  foreignKey: 'nivelSeveridadId',
  as: 'desviaciones',
});
db.Desviacion.belongsTo(db.NivelSeveridad, {
  foreignKey: 'nivelSeveridadId',
  as: 'nivelSeveridad',
});
db.Usuario.hasMany(db.Desviacion, { foreignKey: 'detectadaPor', as: 'desviacionesDetectadas' });
db.Desviacion.belongsTo(db.Usuario, { foreignKey: 'detectadaPor', as: 'detector' });
db.Usuario.hasMany(db.Desviacion, { foreignKey: 'cerradaPor', as: 'desviacionesCerradas' });
db.Desviacion.belongsTo(db.Usuario, { foreignKey: 'cerradaPor', as: 'cerrador' });

db.Desviacion.hasMany(db.AccionCorrectiva, {
  foreignKey: 'desviacionId',
  as: 'accionesCorrectivas',
});
db.AccionCorrectiva.belongsTo(db.Desviacion, { foreignKey: 'desviacionId', as: 'desviacion' });
db.TipoAccion.hasMany(db.AccionCorrectiva, {
  foreignKey: 'tipoAccionId',
  as: 'accionesCorrectivas',
});
db.AccionCorrectiva.belongsTo(db.TipoAccion, { foreignKey: 'tipoAccionId', as: 'tipoAccion' });
db.AccionCorrectiva.hasMany(db.CampoAccionInstancia, {
  foreignKey: 'accionCorrectivaId',
  as: 'camposAdicionales',
});
db.CampoAccionInstancia.belongsTo(db.AccionCorrectiva, {
  foreignKey: 'accionCorrectivaId',
  as: 'accionCorrectiva',
});
db.CampoAccionCorrectiva.hasMany(db.CampoAccionInstancia, {
  foreignKey: 'campoAccionCorrectivaId',
  as: 'instancias',
});
db.CampoAccionInstancia.belongsTo(db.CampoAccionCorrectiva, {
  foreignKey: 'campoAccionCorrectivaId',
  as: 'campoOrigen',
});
db.Usuario.hasMany(db.AccionCorrectiva, {
  foreignKey: 'responsableId',
  as: 'accionesCorrectivasAsignadas',
});
db.AccionCorrectiva.belongsTo(db.Usuario, { foreignKey: 'responsableId', as: 'responsable' });
db.Usuario.hasMany(db.AccionCorrectiva, {
  foreignKey: 'cerradaPor',
  as: 'accionesCorrectivasCerradas',
});
db.AccionCorrectiva.belongsTo(db.Usuario, { foreignKey: 'cerradaPor', as: 'cerrador' });
db.Usuario.hasMany(db.AccionCorrectiva, {
  foreignKey: 'enviadaAprobacionPor',
  as: 'accionesCorrectivasEnviadasAprobacion',
});
db.AccionCorrectiva.belongsTo(db.Usuario, {
  foreignKey: 'enviadaAprobacionPor',
  as: 'remitenteAprobacion',
});

db.Usuario.hasOne(db.AprobadorAccionCorrectiva, {
  foreignKey: 'usuarioId',
  as: 'autorizacionAprobacionAcciones',
});
db.AprobadorAccionCorrectiva.belongsTo(db.Usuario, {
  foreignKey: 'usuarioId',
  as: 'usuario',
});
db.Usuario.hasMany(db.AprobadorAccionCorrectiva, {
  foreignKey: 'agregadoPor',
  as: 'aprobadoresAccionesRegistrados',
});
db.AprobadorAccionCorrectiva.belongsTo(db.Usuario, {
  foreignKey: 'agregadoPor',
  as: 'agregadoPorUsuario',
});

db.AccionCorrectiva.hasMany(db.SeguimientoAccionCorrectiva, {
  foreignKey: 'accionCorrectivaId',
  as: 'seguimientos',
});
db.SeguimientoAccionCorrectiva.belongsTo(db.AccionCorrectiva, {
  foreignKey: 'accionCorrectivaId',
  as: 'accionCorrectiva',
});
db.UnidadMedida.hasMany(db.SeguimientoAccionCorrectiva, {
  foreignKey: 'unidadMedidaId',
  as: 'seguimientos',
});
db.SeguimientoAccionCorrectiva.belongsTo(db.UnidadMedida, {
  foreignKey: 'unidadMedidaId',
  as: 'unidadMedida',
});
db.Usuario.hasMany(db.SeguimientoAccionCorrectiva, {
  foreignKey: 'registradoPor',
  as: 'seguimientosRegistrados',
});
db.SeguimientoAccionCorrectiva.belongsTo(db.Usuario, {
  foreignKey: 'registradoPor',
  as: 'registrador',
});

db.AccionCorrectiva.hasMany(db.EvidenciaAccionCorrectiva, {
  foreignKey: 'accionCorrectivaId',
  as: 'evidencias',
});
db.EvidenciaAccionCorrectiva.belongsTo(db.AccionCorrectiva, {
  foreignKey: 'accionCorrectivaId',
  as: 'accionCorrectiva',
});
db.SeguimientoAccionCorrectiva.hasMany(db.EvidenciaAccionCorrectiva, {
  foreignKey: 'seguimientoAccionCorrectivaId',
  as: 'evidencias',
});
db.EvidenciaAccionCorrectiva.belongsTo(db.SeguimientoAccionCorrectiva, {
  foreignKey: 'seguimientoAccionCorrectivaId',
  as: 'seguimiento',
});
db.Usuario.hasMany(db.EvidenciaAccionCorrectiva, {
  foreignKey: 'subidoPor',
  as: 'evidenciasSubidas',
});

// RECEPCIÓN
Proveedor.hasMany(Recepcion, {
  foreignKey: 'proveedorId',
  as: 'recepciones'
});

Recepcion.belongsTo(Proveedor, {
  foreignKey: 'proveedorId',
  as: 'proveedor'
});

Bodega.hasMany(Recepcion, {
  foreignKey: 'bodegaId',
  as: 'recepciones'
});

Recepcion.belongsTo(Bodega, {
  foreignKey: 'bodegaId',
  as: 'bodega'
});

LugarArea.hasMany(Recepcion, {
  foreignKey: 'lugarAreaId',
  as: 'recepciones'
});

Recepcion.belongsTo(LugarArea, {
  foreignKey: 'lugarAreaId',
  as: 'lugarArea'
});

Usuario.hasMany(Recepcion, {
  foreignKey: 'usuarioRecepcionId',
  as: 'recepcionesRealizadas'
});

Recepcion.belongsTo(Usuario, {
  foreignKey: 'usuarioRecepcionId',
  as: 'usuarioRecepcion'
});

// DETALLES
Recepcion.hasMany(DetalleRecepcion, {
  foreignKey: 'recepcionId',
  as: 'detalles'
});

DetalleRecepcion.belongsTo(Recepcion, {
  foreignKey: 'recepcionId',
  as: 'recepcion'
});

Producto.hasMany(DetalleRecepcion, {
  foreignKey: 'productoId',
  as: 'detallesRecepcion'
});

DetalleRecepcion.belongsTo(Producto, {
  foreignKey: 'productoId',
  as: 'producto'
});

// VEHÍCULO
Recepcion.hasMany(RecepcionVehiculo, {
  foreignKey: 'recepcionId',
  as: 'vehiculos'
});

RecepcionVehiculo.belongsTo(Recepcion, {
  foreignKey: 'recepcionId',
  as: 'recepcion'
});

Vehiculo.hasMany(RecepcionVehiculo, {
  foreignKey: 'vehiculoId',
  as: 'recepcionesVehiculo'
});

RecepcionVehiculo.belongsTo(Vehiculo, {
  foreignKey: 'vehiculoId',
  as: 'vehiculo'
});

// VERIFICACIÓN
Recepcion.hasOne(VerificacionRecepcion, {
  foreignKey: 'recepcionId',
  as: 'verificacion'
});

VerificacionRecepcion.belongsTo(Recepcion, {
  foreignKey: 'recepcionId',
  as: 'recepcion'
});

// TEMPERATURAS
Recepcion.hasMany(TemperaturaRecepcion, {
  foreignKey: 'recepcionId',
  as: 'temperaturas'
});

TemperaturaRecepcion.belongsTo(Recepcion, {
  foreignKey: 'recepcionId',
  as: 'recepcion'
});

Producto.hasMany(TemperaturaRecepcion, {
  foreignKey: 'productoId',
  as: 'temperaturasRecepcion'
});

TemperaturaRecepcion.belongsTo(Producto, {
  foreignKey: 'productoId',
  as: 'producto'
});

// CONDICIÓN AMBIENTAL
Recepcion.hasOne(CondicionAmbientalRecepcion, {
  foreignKey: 'recepcionId',
  as: 'condicionAmbiental'
});

CondicionAmbientalRecepcion.belongsTo(Recepcion, {
  foreignKey: 'recepcionId',
  as: 'recepcion'
});

// RESULTADO
Recepcion.hasOne(ResultadoRecepcion, {
  foreignKey: 'recepcionId',
  as: 'resultado'
});

ResultadoRecepcion.belongsTo(Recepcion, {
  foreignKey: 'recepcionId',
  as: 'recepcion'
});

db.EvidenciaAccionCorrectiva.belongsTo(db.Usuario, { foreignKey: 'subidoPor', as: 'autor' });

db.sequelize = sequelize;

module.exports = db;
