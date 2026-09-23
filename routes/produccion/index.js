const { Router } = require('express');

const auth = require('../../middleware/auth');
const permiso = require('../../middleware/permiso');
const validar = require('../../middleware/validar');
const formula = require('../../controllers/produccion/formula.controller');
const orden = require('../../controllers/produccion/orden-produccion.controller');
const control = require('../../controllers/produccion/control-produccion.controller');
const {
  productoTerminadoIdValidator,
  guardarFormulaValidator,
} = require('../../validators/produccion/formula.validator');
const {
  cambiarLoteValidator,
  guardarOrdenValidator,
  idOrdenValidator,
  listarOrdenesValidator,
  loteSimulacionValidator,
} = require('../../validators/produccion/orden-produccion.validator');
const {
  guardarMermaValidator,
  guardarResultadosValidator,
  idOrdenControlValidator,
  listarControlValidator,
  mermaIdValidator,
} = require('../../validators/produccion/control-produccion.validator');

const router = Router();

router.use(auth);

/**
 * @swagger
 * tags:
 *   name: Producción - Fórmulas
 *   description: Parametrización de recetas para productos terminados
 */

/**
 * @swagger
 * /api/produccion/formulas/catalogos:
 *   get:
 *     tags: [Producción - Fórmulas]
 *     summary: Obtener PT y componentes disponibles agrupados por categoría
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Catálogos para construir fórmulas
 */
router.get('/formulas/catalogos', permiso('produccion.ver'), formula.catalogos);

/**
 * @swagger
 * /api/produccion/formulas/producto/{productoTerminadoId}:
 *   get:
 *     tags: [Producción - Fórmulas]
 *     summary: Obtener la fórmula activa de un PT
 *     security:
 *       - bearerAuth: []
 *   put:
 *     tags: [Producción - Fórmulas]
 *     summary: Crear o reemplazar la fórmula activa de un PT
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/formulas/producto/:productoTerminadoId',
  permiso('produccion.ver'),
  productoTerminadoIdValidator,
  validar,
  formula.obtener,
);
router.put(
  '/formulas/producto/:productoTerminadoId',
  permiso('produccion.crear', 'produccion.editar'),
  guardarFormulaValidator,
  validar,
  formula.guardar,
);

/**
 * @swagger
 * /api/produccion/ordenes/catalogos:
 *   get:
 *     tags: [Producción - Órdenes]
 *     summary: Listar productos terminados disponibles para una orden
 *     security:
 *       - bearerAuth: []
 */
router.get('/ordenes/catalogos', permiso('produccion.ver'), orden.catalogos);

/**
 * @swagger
 * /api/produccion/ordenes:
 *   get:
 *     tags: [Producción - Órdenes]
 *     summary: Listar órdenes de producción
 *     security:
 *       - bearerAuth: []
 *   post:
 *     tags: [Producción - Órdenes]
 *     summary: Crear una orden en borrador
 *     security:
 *       - bearerAuth: []
 */
router.get('/ordenes', permiso('produccion.ver'), listarOrdenesValidator, validar, orden.listar);
router.post('/ordenes', permiso('produccion.crear'), guardarOrdenValidator, validar, orden.crear);

/**
 * @swagger
 * /api/produccion/ordenes/{id}:
 *   get:
 *     tags: [Producción - Órdenes]
 *     summary: Consultar una orden con su simulación
 *     security:
 *       - bearerAuth: []
 *   put:
 *     tags: [Producción - Órdenes]
 *     summary: Actualizar una orden en borrador
 *     security:
 *       - bearerAuth: []
 *   delete:
 *     tags: [Producción - Órdenes]
 *     summary: Eliminar una orden en borrador
 *     security:
 *       - bearerAuth: []
 */
router.get('/ordenes/:id', permiso('produccion.ver'), idOrdenValidator, validar, orden.obtener);
router.put(
  '/ordenes/:id',
  permiso('produccion.editar'),
  [...idOrdenValidator, ...guardarOrdenValidator],
  validar,
  orden.actualizar,
);
router.delete(
  '/ordenes/:id',
  permiso('produccion.editar'),
  idOrdenValidator,
  validar,
  orden.eliminar,
);

/**
 * @swagger
 * /api/produccion/ordenes/{id}/simular:
 *   post:
 *     tags: [Producción - Órdenes]
 *     summary: Explotar fórmulas, consultar stock y guardar sugerencias FEFO
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/ordenes/:id/simular',
  permiso('produccion.editar'),
  idOrdenValidator,
  validar,
  orden.simular,
);
/**
 * @swagger
 * /api/produccion/ordenes/{id}/confirmar-salida-mp:
 *   post:
 *     tags: [Producción - Órdenes]
 *     summary: Confirmar los lotes simulados y generar el movimiento SA
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/ordenes/:id/confirmar-salida-mp',
  permiso('produccion.confirmar_salida_mp'),
  idOrdenValidator,
  validar,
  orden.confirmarSalida,
);
router.get(
  '/ordenes/:id/simulacion',
  permiso('produccion.ver'),
  idOrdenValidator,
  validar,
  orden.obtenerSimulacion,
);
router.get(
  '/ordenes/:id/simulacion/lotes/:loteSimulacionId/disponibles',
  permiso('produccion.ver'),
  loteSimulacionValidator,
  validar,
  orden.lotesDisponibles,
);
router.patch(
  '/ordenes/:id/simulacion/lotes/:loteSimulacionId',
  permiso('produccion.editar'),
  cambiarLoteValidator,
  validar,
  orden.cambiarLote,
);

/**
 * @swagger
 * tags:
 *   name: Producción - Control
 *   description: Producción real y mermas de órdenes en producción
 */

/**
 * @swagger
 * /api/produccion/control/ordenes:
 *   get:
 *     tags: [Producción - Control]
 *     summary: Listar únicamente órdenes en estado EN_PRODUCCION
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/control/ordenes',
  permiso('produccion.control.ver'),
  listarControlValidator,
  validar,
  control.listarOrdenes,
);

/**
 * @swagger
 * /api/produccion/control/ordenes/{id}:
 *   get:
 *     tags: [Producción - Control]
 *     summary: Consultar el detalle operativo, resultados y mermas de una OT
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/control/ordenes/:id',
  permiso('produccion.control.ver'),
  idOrdenControlValidator,
  validar,
  control.obtenerDetalle,
);

/**
 * @swagger
 * /api/produccion/control/ordenes/{id}/resultados:
 *   put:
 *     tags: [Producción - Control]
 *     summary: Guardar o actualizar la producción real de los PT
 *     security:
 *       - bearerAuth: []
 */
router.put(
  '/control/ordenes/:id/resultados',
  permiso('produccion.control.editar'),
  guardarResultadosValidator,
  validar,
  control.guardarResultados,
);

/**
 * @swagger
 * /api/produccion/control/ordenes/{id}/mermas:
 *   get:
 *     tags: [Producción - Control]
 *     summary: Listar las mermas registradas para la OT
 *     security:
 *       - bearerAuth: []
 *   post:
 *     tags: [Producción - Control]
 *     summary: Registrar una merma de MP o PT
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/control/ordenes/:id/mermas',
  permiso('produccion.control.ver'),
  idOrdenControlValidator,
  validar,
  control.listarMermas,
);
router.post(
  '/control/ordenes/:id/mermas',
  permiso('produccion.mermas.registrar'),
  guardarMermaValidator,
  validar,
  control.crearMerma,
);

/**
 * @swagger
 * /api/produccion/control/ordenes/{id}/mermas/{mermaId}:
 *   put:
 *     tags: [Producción - Control]
 *     summary: Editar una merma mientras la OT esté EN_PRODUCCION
 *     security:
 *       - bearerAuth: []
 *   delete:
 *     tags: [Producción - Control]
 *     summary: Eliminar una merma mientras la OT esté EN_PRODUCCION
 *     security:
 *       - bearerAuth: []
 */
router.put(
  '/control/ordenes/:id/mermas/:mermaId',
  permiso('produccion.mermas.registrar'),
  [...mermaIdValidator, ...guardarMermaValidator.slice(1)],
  validar,
  control.actualizarMerma,
);
router.delete(
  '/control/ordenes/:id/mermas/:mermaId',
  permiso('produccion.mermas.registrar'),
  mermaIdValidator,
  validar,
  control.eliminarMerma,
);

module.exports = router;
