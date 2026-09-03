const { Router } = require('express');
const auth = require('../../middleware/auth');
const registrarCrud = require('./registrarCrud');
const catalogos = require('../../validators/calidad/catalogos.validator');
const configuracion = require('../../validators/calidad/configuracion.validator');
const validar = require('../../middleware/validar');
const permiso = require('../../middleware/permiso');
const ejecucion = require('../../validators/calidad/ejecucion.validator');
const checklists = require('../../validators/calidad/checklists.validator');
const programaciones = require('../../validators/calidad/programaciones.validator');
const programas = require('../../validators/calidad/programas.validator');
const camposAccion = require('../../validators/calidad/campos-accion.validator');
const dashboard = require('../../validators/calidad/dashboard.validator');
const lugares = require('../../validators/calidad/lugares-inspeccion.validator');

const router = Router();
router.use(auth);

/**
 * @swagger
 * tags:
 *   - name: Calidad
 *     description: Maestros y configuración del motor de calidad
 * /api/calidad/tipos-inspeccion:
 *   get:
 *     tags: [Calidad]
 *     summary: Lista los tipos de inspección
 *     security: [{ bearerAuth: [] }]
 *   post:
 *     tags: [Calidad]
 *     summary: Crea un tipo de inspección
 *     security: [{ bearerAuth: [] }]
 * /api/calidad/programas:
 *   get:
 *     tags: [Calidad]
 *     summary: Lista programas activos e inactivos
 *     security: [{ bearerAuth: [] }]
 *   post:
 *     tags: [Calidad]
 *     summary: Crea un programa y permite adjuntar un PDF
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [nombre]
 *             properties:
 *               nombre: { type: string }
 *               descripcion: { type: string }
 *               estado: { type: boolean }
 *               archivo_pdf: { type: string, format: binary }
 * /api/calidad/programas/{id}:
 *   get:
 *     tags: [Calidad]
 *     summary: Obtiene un programa
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *   put:
 *     tags: [Calidad]
 *     summary: Edita un programa o reemplaza su PDF
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               nombre: { type: string }
 *               descripcion: { type: string }
 *               estado: { type: boolean }
 *               archivo_pdf: { type: string, format: binary }
 *   delete:
 *     tags: [Calidad]
 *     summary: Inactiva un programa sin eliminarlo físicamente
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 * /api/calidad/archivos-programas/{nombre}:
 *   get:
 *     tags: [Calidad]
 *     summary: Consulta el PDF almacenado de un programa
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: nombre
 *         required: true
 *         schema: { type: string }
 * /api/calidad/versiones-formato/{id}/completa:
 *   get:
 *     tags: [Calidad]
 *     summary: Obtiene una versión con formato, secciones, campos, reglas y acciones
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 * /api/calidad/categorias-elemento:
 *   get:
 *     tags: [Calidad]
 *     summary: Lista las categorías reutilizables de elementos
 *     security: [{ bearerAuth: [] }]
 *   post:
 *     tags: [Calidad]
 *     summary: Crea una categoría de elementos
 *     security: [{ bearerAuth: [] }]
 * /api/calidad/elementos-inspeccion:
 *   get:
 *     tags: [Calidad]
 *     summary: Lista elementos y permite filtrar por categoria_id y estado
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: categoria_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: estado
 *         schema: { type: boolean }
 * /api/calidad/criterios-inspeccion:
 *   get:
 *     tags: [Calidad]
 *     summary: Lista criterios reutilizables con severidad y acciones
 *     security: [{ bearerAuth: [] }]
 *   post:
 *     tags: [Calidad]
 *     summary: Crea un criterio y sincroniza sus acciones de incumplimiento
 *     security: [{ bearerAuth: [] }]
 * /api/calidad/checklists-seccion:
 *   post:
 *     tags: [Calidad]
 *     summary: Agrega un checklist con una selección exacta de elementos a una sección borrador
 *     security: [{ bearerAuth: [] }]
 * /api/calidad/checklists-seccion/{id}/elementos:
 *   get:
 *     tags: [Calidad]
 *     summary: Lista los elementos versionados de un checklist
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 * /api/calidad/campos-accion-correctiva:
 *   get:
 *     tags: [Calidad]
 *     summary: Lista el maestro de campos disponibles para acciones correctivas
 *     security: [{ bearerAuth: [] }]
 *   post:
 *     tags: [Calidad]
 *     summary: Crea un campo de texto reutilizable para acciones correctivas
 *     security: [{ bearerAuth: [] }]
 * /api/calidad/campos-accion-correctiva/{id}:
 *   put:
 *     tags: [Calidad]
 *     summary: Edita o activa un campo de acción correctiva
 *     security: [{ bearerAuth: [] }]
 *   delete:
 *     tags: [Calidad]
 *     summary: Inactiva un campo sin eliminar su información histórica
 *     security: [{ bearerAuth: [] }]
 * /api/calidad/parametros/{id}/campos-accion:
 *   get:
 *     tags: [Calidad]
 *     summary: Consulta los campos configurados para un parámetro
 *     security: [{ bearerAuth: [] }]
 *   put:
 *     tags: [Calidad]
 *     summary: Asigna, ordena y define obligatoriedad de campos para un parámetro
 *     security: [{ bearerAuth: [] }]
 * /api/calidad/criterios-inspeccion/{id}/campos-accion:
 *   get:
 *     tags: [Calidad]
 *     summary: Consulta los campos configurados para un criterio de checklist
 *     security: [{ bearerAuth: [] }]
 *   put:
 *     tags: [Calidad]
 *     summary: Asigna, ordena y define obligatoriedad de campos para un criterio
 *     security: [{ bearerAuth: [] }]
 * /api/calidad/acciones-correctivas/{id}/campos-adicionales:
 *   put:
 *     tags: [Calidad]
 *     summary: Guarda los valores del snapshot de campos de una acción activa
 *     security: [{ bearerAuth: [] }]
 * /api/calidad/dashboard/resumen:
 *   get:
 *     tags: [Calidad]
 *     summary: Obtiene los seis indicadores informativos del Home para una fecha
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: fecha
 *         required: false
 *         schema: { type: string, format: date }
 * /api/calidad/categorias-lugar-inspeccion:
 *   get:
 *     tags: [Calidad]
 *     summary: Lista las categorías de lugares en su orden visual
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: solo_activos
 *         schema: { type: boolean }
 *   post:
 *     tags: [Calidad]
 *     summary: Crea una categoría asignando automáticamente el siguiente orden
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre]
 *             properties:
 *               nombre: { type: string, example: BAÑOS }
 * /api/calidad/categorias-lugar-inspeccion/{id}:
 *   get:
 *     tags: [Calidad]
 *     summary: Obtiene una categoría con sus lugares hijos
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *   put:
 *     tags: [Calidad]
 *     summary: Edita el nombre o activa/inactiva una categoría
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *   delete:
 *     tags: [Calidad]
 *     summary: Inactiva lógicamente una categoría
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 * /api/calidad/lugares-inspeccion:
 *   get:
 *     tags: [Calidad]
 *     summary: Lista lugares y permite filtrar por categoría y estado activo
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: categoria_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: solo_activos
 *         schema: { type: boolean }
 *   post:
 *     tags: [Calidad]
 *     summary: Crea un lugar hijo con orden automático dentro de su categoría
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre, categoriaLugarInspeccionId]
 *             properties:
 *               nombre: { type: string, example: Baño mujeres }
 *               categoriaLugarInspeccionId: { type: string, format: uuid }
 * /api/calidad/lugares-inspeccion/{id}:
 *   get:
 *     tags: [Calidad]
 *     summary: Obtiene un lugar con su categoría
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *   put:
 *     tags: [Calidad]
 *     summary: Edita el nombre o activa/inactiva un lugar
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *   delete:
 *     tags: [Calidad]
 *     summary: Inactiva lógicamente un lugar
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 */

const montar = (ruta, controlador, crear, actualizar) =>
  router.use(
    ruta,
    registrarCrud({
      controlador,
      validadores: { id: catalogos.idValidator, crear, actualizar },
      prefijoPermiso: 'calidad',
    }),
  );

const dashboardCalidad = require('../../controllers/calidad/dashboard-calidad.controller');
router.get(
  '/dashboard/resumen',
  permiso('calidad.ver'),
  dashboard.resumenValidator,
  validar,
  dashboardCalidad.resumen,
);

const configuracionCamposAccion = require('../../controllers/calidad/configuracion-campos-accion.controller');
router.get(
  '/parametros/:id/campos-accion',
  permiso('calidad.ver'),
  camposAccion.idValidator,
  validar,
  configuracionCamposAccion.listarParametro,
);
router.put(
  '/parametros/:id/campos-accion',
  permiso('calidad.editar'),
  camposAccion.configurarValidator,
  validar,
  configuracionCamposAccion.guardarParametro,
);

montar(
  '/tipos-inspeccion',
  require('../../controllers/calidad/tipo-inspeccion.controller'),
  catalogos.crearCatalogoValidator,
  catalogos.actualizarCatalogoValidator,
);
montar(
  '/unidades-medida',
  require('../../controllers/calidad/unidad-medida.controller'),
  catalogos.crearUnidadValidator,
  catalogos.actualizarUnidadValidator,
);
montar(
  '/parametros',
  require('../../controllers/calidad/parametro-calidad.controller'),
  catalogos.crearParametroValidator,
  catalogos.actualizarParametroValidator,
);
montar(
  '/tipos-campo',
  require('../../controllers/calidad/tipo-campo.controller'),
  catalogos.crearTipoCampoValidator,
  catalogos.actualizarTipoCampoValidator,
);
montar(
  '/niveles-severidad',
  require('../../controllers/calidad/nivel-severidad.controller'),
  catalogos.crearNivelValidator,
  catalogos.actualizarNivelValidator,
);
montar(
  '/tipos-accion',
  require('../../controllers/calidad/tipo-accion.controller'),
  catalogos.crearCatalogoValidator,
  catalogos.actualizarCatalogoValidator,
);
const categoriaLugar = require('../../controllers/calidad/categoria-lugar-inspeccion.controller');
router.get(
  '/categorias-lugar-inspeccion',
  permiso('calidad.ver'),
  lugares.listarCategoriasValidator,
  validar,
  categoriaLugar.listar,
);
router.get(
  '/categorias-lugar-inspeccion/:id',
  permiso('calidad.ver'),
  lugares.idValidator,
  validar,
  categoriaLugar.obtener,
);
router.post(
  '/categorias-lugar-inspeccion',
  permiso('calidad.crear'),
  lugares.crearCategoriaValidator,
  validar,
  categoriaLugar.crear,
);
router.put(
  '/categorias-lugar-inspeccion/:id',
  permiso('calidad.editar'),
  lugares.actualizarCategoriaValidator,
  validar,
  categoriaLugar.actualizar,
);
router.delete(
  '/categorias-lugar-inspeccion/:id',
  permiso('calidad.eliminar'),
  lugares.idValidator,
  validar,
  categoriaLugar.eliminar,
);

const lugarInspeccion = require('../../controllers/calidad/lugar-inspeccion.controller');
router.get(
  '/lugares-inspeccion',
  permiso('calidad.ver'),
  lugares.listarLugaresValidator,
  validar,
  lugarInspeccion.listar,
);
router.get(
  '/lugares-inspeccion/:id',
  permiso('calidad.ver'),
  lugares.idValidator,
  validar,
  lugarInspeccion.obtener,
);
router.post(
  '/lugares-inspeccion',
  permiso('calidad.crear'),
  lugares.crearLugarValidator,
  validar,
  lugarInspeccion.crear,
);
router.put(
  '/lugares-inspeccion/:id',
  permiso('calidad.editar'),
  lugares.actualizarLugarValidator,
  validar,
  lugarInspeccion.actualizar,
);
router.delete(
  '/lugares-inspeccion/:id',
  permiso('calidad.eliminar'),
  lugares.idValidator,
  validar,
  lugarInspeccion.eliminar,
);
montar(
  '/campos-accion-correctiva',
  require('../../controllers/calidad/campo-accion-correctiva.controller'),
  camposAccion.crearCampoValidator,
  camposAccion.actualizarCampoValidator,
);

const programaCalidad = require('../../controllers/calidad/programa-calidad.controller');
router.get('/archivos-programas/:nombre', permiso('calidad.ver'), programaCalidad.descargar);
router.get('/programas', permiso('calidad.ver'), programaCalidad.listar);
router.get(
  '/programas/:id',
  permiso('calidad.ver'),
  programas.idValidator,
  validar,
  programaCalidad.obtener,
);
router.post(
  '/programas',
  permiso('calidad.crear'),
  programaCalidad.upload.single('archivo_pdf'),
  programas.crearValidator,
  programaCalidad.validarConArchivo,
  programaCalidad.crear,
);
router.put(
  '/programas/:id',
  permiso('calidad.editar'),
  programaCalidad.upload.single('archivo_pdf'),
  programas.actualizarValidator,
  programaCalidad.validarConArchivo,
  programaCalidad.actualizar,
);
router.delete(
  '/programas/:id',
  permiso('calidad.eliminar'),
  programas.idValidator,
  validar,
  programaCalidad.eliminar,
);

const categoriaElemento = require('../../controllers/calidad/categoria-elemento.controller');
router.get(
  '/categorias-elemento/:id/elementos',
  permiso('calidad.ver'),
  checklists.idValidator,
  validar,
  categoriaElemento.listarElementos,
);
router.use(
  '/categorias-elemento',
  registrarCrud({
    controlador: categoriaElemento,
    validadores: {
      id: checklists.idValidator,
      crear: checklists.crearCategoriaValidator,
      actualizar: checklists.actualizarCategoriaValidator,
    },
    prefijoPermiso: 'calidad',
  }),
);

const elementoInspeccion = require('../../controllers/calidad/elemento-inspeccion.controller');
router.get(
  '/elementos-inspeccion',
  permiso('calidad.ver'),
  checklists.listarElementosValidator,
  validar,
  elementoInspeccion.listar,
);
router.get(
  '/elementos-inspeccion/:id',
  permiso('calidad.ver'),
  checklists.idValidator,
  validar,
  elementoInspeccion.obtener,
);
router.post(
  '/elementos-inspeccion',
  permiso('calidad.crear'),
  checklists.crearElementoValidator,
  validar,
  elementoInspeccion.crear,
);
router.put(
  '/elementos-inspeccion/:id',
  permiso('calidad.editar'),
  checklists.actualizarElementoValidator,
  validar,
  elementoInspeccion.actualizar,
);
router.delete(
  '/elementos-inspeccion/:id',
  permiso('calidad.eliminar'),
  checklists.idValidator,
  validar,
  elementoInspeccion.eliminar,
);

router.get(
  '/criterios-inspeccion/:id/campos-accion',
  permiso('calidad.ver'),
  camposAccion.idValidator,
  validar,
  configuracionCamposAccion.listarCriterio,
);
router.put(
  '/criterios-inspeccion/:id/campos-accion',
  permiso('calidad.editar'),
  camposAccion.configurarValidator,
  validar,
  configuracionCamposAccion.guardarCriterio,
);

router.use(
  '/criterios-inspeccion',
  registrarCrud({
    controlador: require('../../controllers/calidad/criterio-inspeccion.controller'),
    validadores: {
      id: checklists.idValidator,
      crear: checklists.crearCriterioValidator,
      actualizar: checklists.actualizarCriterioValidator,
    },
    prefijoPermiso: 'calidad',
  }),
);
router.use(
  '/acciones-criterio',
  registrarCrud({
    controlador: require('../../controllers/calidad/accion-criterio.controller'),
    validadores: {
      id: checklists.idValidator,
      crear: checklists.crearAccionCriterioValidator,
      actualizar: checklists.actualizarAccionCriterioValidator,
    },
    prefijoPermiso: 'calidad',
  }),
);

const formato = require('../../controllers/calidad/formato-calidad.controller');
router.get('/formatos', permiso('calidad.ver'), formato.listar);
router.get('/formatos-operativos', permiso('inspecciones.ver'), formato.listarOperativos);
router.get(
  '/formatos/:id',
  permiso('calidad.ver'),
  configuracion.idValidator,
  validar,
  formato.obtener,
);
router.post(
  '/formatos',
  permiso('calidad.crear'),
  configuracion.crearFormatoValidator,
  validar,
  formato.crear,
);
router.put(
  '/formatos/:id',
  permiso('calidad.editar'),
  configuracion.actualizarFormatoValidator,
  validar,
  formato.actualizar,
);
router.delete(
  '/formatos/:id',
  permiso('calidad.eliminar'),
  configuracion.idValidator,
  validar,
  formato.eliminar,
);

const version = require('../../controllers/calidad/version-formato.controller');
router.get(
  '/formatos/:formatoId/versiones',
  permiso('calidad.ver'),
  configuracion.formatoIdValidator,
  validar,
  version.listarPorFormato,
);
router.post(
  '/formatos/:formatoId/versiones',
  permiso('calidad.crear'),
  (req, _res, next) => {
    req.body.formatoCalidadId = req.params.formatoId;
    next();
  },
  configuracion.formatoIdValidator,
  configuracion.crearVersionValidator,
  validar,
  version.crear,
);
router.get(
  '/versiones-formato/:id/completa',
  permiso('calidad.ver'),
  configuracion.idValidator,
  validar,
  version.obtenerCompleta,
);
router.post(
  '/versiones-formato/:id/publicar',
  permiso('calidad.editar'),
  configuracion.publicarVersionValidator,
  validar,
  version.publicar,
);
router.use(
  '/versiones-formato',
  registrarCrud({
    controlador: version,
    validadores: {
      id: configuracion.idValidator,
      crear: configuracion.crearVersionValidator,
      actualizar: configuracion.actualizarVersionValidator,
    },
    prefijoPermiso: 'calidad',
  }),
);

const configuraciones = [
  {
    ruta: '/secciones-formato',
    controlador: require('../../controllers/calidad/seccion-formato.controller'),
    crear: configuracion.crearSeccionValidator,
    actualizar: configuracion.actualizarSeccionValidator,
  },
  {
    ruta: '/campos-formato',
    controlador: require('../../controllers/calidad/campo-formato.controller'),
    crear: configuracion.crearCampoValidator,
    actualizar: configuracion.actualizarCampoValidator,
  },
  {
    ruta: '/opciones-campo',
    controlador: require('../../controllers/calidad/opcion-campo.controller'),
    crear: configuracion.crearOpcionValidator,
    actualizar: configuracion.actualizarOpcionValidator,
  },
];

for (const item of configuraciones) {
  router.use(
    item.ruta,
    registrarCrud({
      controlador: item.controlador,
      validadores: {
        id: configuracion.idValidator,
        crear: item.crear,
        actualizar: item.actualizar,
      },
      prefijoPermiso: 'calidad',
    }),
  );
}

const programacion = require('../../controllers/calidad/programacion-formato.controller');
router.get(
  '/programaciones/pendientes',
  permiso('inspecciones.ver'),
  programaciones.fechaPendientesValidator,
  validar,
  programacion.pendientes,
);
router.get('/programaciones', permiso('calidad.ver'), programacion.listar);
router.get(
  '/programaciones/:id',
  permiso('calidad.ver'),
  programaciones.idValidator,
  validar,
  programacion.obtener,
);
router.post(
  '/programaciones',
  permiso('calidad.crear'),
  programaciones.crearValidator,
  validar,
  programacion.crear,
);
router.put(
  '/programaciones/:id',
  permiso('calidad.editar'),
  programaciones.actualizarValidator,
  validar,
  programacion.actualizar,
);

const checklistSeccion = require('../../controllers/calidad/checklist-seccion.controller');
router.get(
  '/checklists-seccion/:id/elementos',
  permiso('calidad.ver'),
  checklists.idValidator,
  validar,
  checklistSeccion.listarElementos,
);
router.use(
  '/checklists-seccion',
  registrarCrud({
    controlador: checklistSeccion,
    validadores: {
      id: checklists.idValidator,
      crear: checklists.crearChecklistValidator,
      actualizar: checklists.actualizarChecklistValidator,
    },
    prefijoPermiso: 'calidad',
  }),
);

// Ejecución de inspecciones
const inspeccion = require('../../controllers/calidad/inspeccion.controller');
const respuesta = require('../../controllers/calidad/respuesta-inspeccion.controller');
const respuestaChecklist = require('../../controllers/calidad/respuesta-checklist.controller');
router.get('/inspecciones/pendientes', permiso('inspecciones.ver'), inspeccion.pendientes);
router.get(
  '/inspecciones',
  permiso('inspecciones.ver'),
  ejecucion.listarInspeccionesValidator,
  validar,
  inspeccion.listar,
);
router.post(
  '/inspecciones',
  permiso('inspecciones.crear'),
  ejecucion.crearInspeccionValidator,
  validar,
  inspeccion.crear,
);
router.get(
  '/inspecciones/:id/completa',
  permiso('inspecciones.ver'),
  ejecucion.idValidator,
  validar,
  inspeccion.obtenerCompleta,
);
router.post(
  '/inspecciones/:id/respuestas',
  permiso('inspecciones.editar'),
  ejecucion.guardarRespuestasValidator,
  validar,
  respuesta.guardarRespuestas,
);
router.post(
  '/inspecciones/:id/respuestas-checklist',
  permiso('inspecciones.editar'),
  ejecucion.guardarChecklistValidator,
  validar,
  respuestaChecklist.guardar,
);
router.post(
  '/inspecciones/:id/completar',
  permiso('inspecciones.editar'),
  ejecucion.idValidator,
  validar,
  inspeccion.completar,
);
router.post(
  '/inspecciones/:id/cerrar',
  permiso('inspecciones.cerrar'),
  ejecucion.idValidator,
  validar,
  inspeccion.cerrar,
);
router.get(
  '/inspecciones/:id',
  permiso('inspecciones.ver'),
  ejecucion.idValidator,
  validar,
  inspeccion.obtener,
);
router.put(
  '/inspecciones/:id',
  permiso('inspecciones.editar'),
  ejecucion.actualizarInspeccionValidator,
  validar,
  inspeccion.actualizar,
);

const accionCorrectiva = require('../../controllers/calidad/accion-correctiva.controller');
const seguimiento = require('../../controllers/calidad/seguimiento-accion-correctiva.controller');
const evidencia = require('../../controllers/calidad/evidencia-accion-correctiva.controller');
const aprobadorAccion = require('../../controllers/calidad/aprobador-accion-correctiva.controller');
router.get(
  '/aprobadores-acciones-correctivas/usuarios-disponibles',
  permiso('calidad.ver'),
  aprobadorAccion.usuariosDisponibles,
);
router.get('/aprobadores-acciones-correctivas', permiso('calidad.ver'), aprobadorAccion.listar);
router.post(
  '/aprobadores-acciones-correctivas',
  permiso('calidad.editar'),
  ejecucion.crearAprobadorValidator,
  validar,
  aprobadorAccion.crear,
);
router.delete(
  '/aprobadores-acciones-correctivas/:id',
  permiso('calidad.editar'),
  ejecucion.idValidator,
  validar,
  aprobadorAccion.eliminar,
);
router.get(
  '/acciones-correctivas',
  permiso('acciones_correctivas.ver'),
  ejecucion.listarAccionesValidator,
  validar,
  accionCorrectiva.listar,
);
router.get(
  '/acciones-correctivas/:id',
  permiso('acciones_correctivas.ver'),
  ejecucion.idValidator,
  validar,
  accionCorrectiva.obtener,
);
router.put(
  '/acciones-correctivas/:id',
  permiso('acciones_correctivas.editar'),
  ejecucion.actualizarAccionValidator,
  validar,
  accionCorrectiva.actualizar,
);
router.post(
  '/acciones-correctivas/:id/iniciar',
  permiso('acciones_correctivas.editar'),
  ejecucion.idValidator,
  validar,
  accionCorrectiva.iniciarAccion,
);
router.put(
  '/acciones-correctivas/:id/campos-adicionales',
  permiso('acciones_correctivas.editar'),
  camposAccion.guardarValoresValidator,
  validar,
  accionCorrectiva.guardarCamposAdicionales,
);
router.post(
  '/acciones-correctivas/:id/enviar-aprobacion',
  permiso('acciones_correctivas.editar'),
  ejecucion.idValidator,
  validar,
  accionCorrectiva.enviarAprobacion,
);
router.post(
  '/acciones-correctivas/:id/cerrar',
  ejecucion.cerrarAccionValidator,
  validar,
  accionCorrectiva.cerrarAccion,
);
router.post(
  '/acciones-correctivas/:id/seguimientos',
  permiso('acciones_correctivas.editar'),
  ejecucion.crearSeguimientoValidator,
  validar,
  seguimiento.crearSeguimiento,
);
router.post(
  '/acciones-correctivas/:id/evidencias',
  permiso('acciones_correctivas.editar'),
  evidencia.upload.single('archivo'),
  evidencia.crearEvidencia,
);
router.get('/archivos-evidencia/:nombre', permiso('acciones_correctivas.ver'), evidencia.descargar);

const desviacion = require('../../controllers/calidad/desviacion.controller');
router.get(
  '/desviaciones',
  permiso('desviaciones.ver'),
  ejecucion.listarDesviacionesValidator,
  validar,
  desviacion.listar,
);
router.get(
  '/desviaciones/:id',
  permiso('desviaciones.ver'),
  ejecucion.idValidator,
  validar,
  desviacion.obtener,
);
router.put(
  '/desviaciones/:id',
  permiso('desviaciones.editar'),
  ejecucion.actualizarDesviacionValidator,
  validar,
  desviacion.actualizar,
);
router.post(
  '/desviaciones/:id/cerrar',
  permiso('desviaciones.cerrar'),
  ejecucion.idValidator,
  validar,
  desviacion.cerrar,
);

module.exports = router;
