const { Router } = require('express');

const ctrl = require('../../controllers/recepcion/condicionAmbientalRecepcion.controller');

const auth = require('../../middleware/auth');
const permiso = require('../../middleware/permiso');
const validar = require('../../middleware/validar');

const {
  recepcionIdValidator,
  crearCondicionAmbientalRecepcionValidator,
  actualizarCondicionAmbientalRecepcionValidator,
} = require('../../validators/recepcion.validator');

const router = Router();

router.use(auth);

// =====================================================
// SWAGGER
// =====================================================

/**
 * @swagger
 * tags:
 *   name: Condiciones Ambientales de Recepción
 *   description: Registro de las condiciones ambientales durante la recepción
 */

// =====================================================
// OBTENER CONDICIÓN AMBIENTAL
// =====================================================

/**
 * @swagger
 * /api/recepciones/{recepcionId}/condicion-ambiental:
 *   get:
 *     tags: [Condiciones Ambientales de Recepción]
 *     summary: Obtener la condición ambiental de una recepción
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recepcionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Condición ambiental encontrada
 *       404:
 *         description: Condición ambiental no encontrada
 */

router.get(
  '/:recepcionId/condicion-ambiental',
  permiso('Recepcion.Ver'),
  recepcionIdValidator,
  validar,
  ctrl.obtener,
);

// =====================================================
// CREAR CONDICIÓN AMBIENTAL
// =====================================================

/**
 * @swagger
 * /api/recepciones/{recepcionId}/condicion-ambiental:
 *   post:
 *     tags: [Condiciones Ambientales de Recepción]
 *     summary: Registrar la condición ambiental de una recepción
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recepcionId
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
 *             properties:
 *               temperatura:
 *                 type: number
 *                 example: 18.50
 *               desinfeccionRealizada:
 *                 type: boolean
 *                 example: true
 *               productoDesinfeccion:
 *                 type: string
 *                 example: Hipoclorito
 *               concentracionDesinfeccion:
 *                 type: string
 *                 example: 200 ppm
 *               observaciones:
 *                 type: string
 *     responses:
 *       201:
 *         description: Condición ambiental creada
 *       409:
 *         description: La recepción ya tiene una condición ambiental
 */

router.post(
  '/:recepcionId/condicion-ambiental',
  permiso('Recepcion.Crear'),
  recepcionIdValidator,
  crearCondicionAmbientalRecepcionValidator,
  validar,
  ctrl.crear,
);

// =====================================================
// ACTUALIZAR CONDICIÓN AMBIENTAL
// =====================================================

/**
 * @swagger
 * /api/recepciones/{recepcionId}/condicion-ambiental:
 *   put:
 *     tags: [Condiciones Ambientales de Recepción]
 *     summary: Actualizar la condición ambiental
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recepcionId
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
 *             properties:
 *               temperatura:
 *                 type: number
 *               desinfeccionRealizada:
 *                 type: boolean
 *               productoDesinfeccion:
 *                 type: string
 *               concentracionDesinfeccion:
 *                 type: string
 *               observaciones:
 *                 type: string
 *     responses:
 *       200:
 *         description: Condición ambiental actualizada
 *       404:
 *         description: Condición ambiental no encontrada
 */

router.put(
  '/:recepcionId/condicion-ambiental',
  permiso('Recepcion.Editar'),
  recepcionIdValidator,
  actualizarCondicionAmbientalRecepcionValidator,
  validar,
  ctrl.actualizar,
);

// =====================================================
// ELIMINAR CONDICIÓN AMBIENTAL
// =====================================================

/**
 * @swagger
 * /api/recepciones/{recepcionId}/condicion-ambiental:
 *   delete:
 *     tags: [Condiciones Ambientales de Recepción]
 *     summary: Eliminar la condición ambiental
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recepcionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Condición ambiental eliminada
 *       404:
 *         description: Condición ambiental no encontrada
 */

router.delete(
  '/:recepcionId/condicion-ambiental',
  permiso('Recepcion.Eliminar'),
  recepcionIdValidator,
  validar,
  ctrl.eliminar,
);

module.exports = router;
