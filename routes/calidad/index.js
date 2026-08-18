const { Router } = require('express');
const auth = require('../../middleware/auth');
const registrarCrud = require('./registrarCrud');
const catalogos = require('../../validators/calidad/catalogos.validator');
const configuracion = require('../../validators/calidad/configuracion.validator');
const validar = require('../../middleware/validar');
const permiso = require('../../middleware/permiso');
const ejecucion = require('../../validators/calidad/ejecucion.validator');
const checklists = require('../../validators/calidad/checklists.validator');

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
montar(
  '/lugares-inspeccion',
  require('../../controllers/calidad/lugar-inspeccion.controller'),
  catalogos.crearCatalogoValidator,
  catalogos.actualizarCatalogoValidator,
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
router.get('/elementos-inspeccion/:id', permiso('calidad.ver'), checklists.idValidator, validar, elementoInspeccion.obtener);
router.post('/elementos-inspeccion', permiso('calidad.crear'), checklists.crearElementoValidator, validar, elementoInspeccion.crear);
router.put('/elementos-inspeccion/:id', permiso('calidad.editar'), checklists.actualizarElementoValidator, validar, elementoInspeccion.actualizar);
router.delete('/elementos-inspeccion/:id', permiso('calidad.eliminar'), checklists.idValidator, validar, elementoInspeccion.eliminar);

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
router.get('/formatos/:id', permiso('calidad.ver'), configuracion.idValidator, validar, formato.obtener);
router.post('/formatos', permiso('calidad.crear'), configuracion.crearFormatoValidator, validar, formato.crear);
router.put('/formatos/:id', permiso('calidad.editar'), configuracion.actualizarFormatoValidator, validar, formato.actualizar);
router.delete('/formatos/:id', permiso('calidad.eliminar'), configuracion.idValidator, validar, formato.eliminar);

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
router.get('/versiones-formato/:id/completa', permiso('calidad.ver'), configuracion.idValidator, validar, version.obtenerCompleta);
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
      validadores: { id: configuracion.idValidator, crear: item.crear, actualizar: item.actualizar },
      prefijoPermiso: 'calidad',
    }),
  );
}

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
router.get(
  '/inspecciones/pendientes',
  permiso('inspecciones.ver'),
  inspeccion.pendientes,
);
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
router.get('/inspecciones/:id', permiso('inspecciones.ver'), ejecucion.idValidator, validar, inspeccion.obtener);
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
router.post(
  '/acciones-correctivas/:id/cerrar',
  permiso('acciones_correctivas.cerrar'),
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
  ejecucion.crearEvidenciaValidator,
  validar,
  evidencia.crearEvidencia,
);

const desviacion = require('../../controllers/calidad/desviacion.controller');
router.get(
  '/desviaciones',
  permiso('desviaciones.ver'),
  ejecucion.listarDesviacionesValidator,
  validar,
  desviacion.listar,
);
router.get('/desviaciones/:id', permiso('desviaciones.ver'), ejecucion.idValidator, validar, desviacion.obtener);
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
