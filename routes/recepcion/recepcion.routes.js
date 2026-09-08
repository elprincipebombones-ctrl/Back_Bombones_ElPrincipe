const { Router } = require('express');

const ctrl = require('../../controllers/recepcion/recepcion.controller');

const auth = require('../../middleware/auth');
const permiso = require('../../middleware/permiso');
const validar = require('../../middleware/validar');

const {
  idRecepcionValidator,
  crearRecepcionValidator,
  actualizarRecepcionValidator,
} = require('../../validators/recepcion.validator');

const router = Router();

router.use(auth);

router.use('/', require('./detalleRecepcion.routes'));
router.use('/', require('./recepcionVehiculo.routes'));
router.use('/', require('./verificacionRecepcion.routes'));
router.use('/', require('./accionMejoraRecepcion.routes'));
router.use('/', require('./temperaturaRecepcion.routes'));
router.use('/', require('./condicionAmbientalRecepcion.routes'));
router.use('/', require('./resultadoRecepcion.routes'));

// =====================================================
// SWAGGER
// =====================================================

/**
 * @swagger
 * tags:
 *   name: Recepciones
 *   description: Gestión de recepción de productos y materias primas
 */

// =====================================================
// LISTAR RECEPCIONES
// =====================================================

/**
 * @swagger
 * /api/recepciones:
 *   get:
 *     tags: [Recepciones]
 *     summary: Listar recepciones
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de recepciones
 */

router.get('/', permiso('Recepcion.Ver'), ctrl.listar);

// =====================================================
// OBTENER RECEPCIÓN
// =====================================================

/**
 * @swagger
 * /api/recepciones/{id}:
 *   get:
 *     tags: [Recepciones]
 *     summary: Obtener una recepción por ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Recepción encontrada
 *       404:
 *         description: Recepción no encontrada
 */

router.get('/:id', permiso('Recepcion.Ver'), idRecepcionValidator, validar, ctrl.obtener);

// =====================================================
// CREAR RECEPCIÓN
// =====================================================

/**
 * @swagger
 * /api/recepciones:
 *   post:
 *     tags: [Recepciones]
 *     summary: Crear una recepción
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fechaRecepcion
 *               - proveedorId
 *               - bodegaId
 *               - detalles
 *             properties:
 *               fechaRecepcion:
 *                 type: string
 *                 format: date-time
 *                 example: 2026-08-24T08:30:00
 *               proveedorId:
 *                 type: string
 *                 format: uuid
 *               bodegaId:
 *                 type: string
 *                 format: uuid
 *               lugarAreaId:
 *                 type: string
 *                 format: uuid
 *               detalles:
 *                 type: array
 *                 items:
 *                   type: object
 *               observaciones:
 *                 type: string
 *     responses:
 *       201:
 *         description: Recepción creada
 *       400:
 *         description: Datos inválidos
 */

router.post('/', permiso('Recepcion.Crear'), crearRecepcionValidator, validar, ctrl.crear);

// =====================================================
// ACTUALIZAR RECEPCIÓN
// =====================================================

/**
 * @swagger
 * /api/recepciones/{id}:
 *   put:
 *     tags: [Recepciones]
 *     summary: Actualizar una recepción
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Recepción actualizada
 *       404:
 *         description: Recepción no encontrada
 */

router.put(
  '/:id',
  permiso('Recepcion.Editar'),
  idRecepcionValidator,
  actualizarRecepcionValidator,
  validar,
  ctrl.actualizar,
);

router.patch(
  '/:id/finalizar',
  permiso('Recepcion.Editar'),
  idRecepcionValidator,
  validar,
  ctrl.finalizar,
);

// =====================================================
// ELIMINAR RECEPCIÓN
// =====================================================

/**
 * @swagger
 * /api/recepciones/{id}:
 *   delete:
 *     tags: [Recepciones]
 *     summary: Eliminar una recepción
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Recepción eliminada
 *       404:
 *         description: Recepción no encontrada
 */

router.delete('/:id', permiso('Recepcion.Eliminar'), idRecepcionValidator, validar, ctrl.eliminar);

module.exports = router;
