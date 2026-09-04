const { Router } = require('express');

const ctrl = require('../../controllers/recepcion/resultadoRecepcion.controller');

const auth = require('../../middleware/auth');
const permiso = require('../../middleware/permiso');
const validar = require('../../middleware/validar');

const {
  recepcionIdValidator,
  crearResultadoRecepcionValidator,
  actualizarResultadoRecepcionValidator,
} = require('../../validators/recepcion.validator');

const router = Router();

router.use(auth);

// =====================================================
// SWAGGER
// =====================================================

/**
 * @swagger
 * tags:
 *   name: Resultados de Recepción
 *   description: Resultado final de la recepción
 */

// =====================================================
// OBTENER RESULTADO
// =====================================================

/**
 * @swagger
 * /api/recepciones/{recepcionId}/resultado:
 *   get:
 *     tags: [Resultados de Recepción]
 *     summary: Obtener el resultado de una recepción
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
 *         description: Resultado encontrado
 *       404:
 *         description: Resultado no encontrado
 */

router.get(
  '/:recepcionId/resultado',
  permiso('Recepcion.Ver'),
  recepcionIdValidator,
  validar,
  ctrl.obtener,
);

// =====================================================
// CREAR RESULTADO
// =====================================================

/**
 * @swagger
 * /api/recepciones/{recepcionId}/resultado:
 *   post:
 *     tags: [Resultados de Recepción]
 *     summary: Registrar el resultado de una recepción
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
 *             required:
 *               - resultado
 *             properties:
 *               resultado:
 *                 type: string
 *                 example: APROBADO
 *               observaciones:
 *                 type: string
 *                 example: Recepción aceptada correctamente
 *               fechaDecision:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Resultado creado
 *       409:
 *         description: La recepción ya tiene un resultado
 */

router.post(
  '/:recepcionId/resultado',
  permiso('Recepcion.Crear'),
  recepcionIdValidator,
  crearResultadoRecepcionValidator,
  validar,
  ctrl.crear,
);

// =====================================================
// ACTUALIZAR RESULTADO
// =====================================================

/**
 * @swagger
 * /api/recepciones/{recepcionId}/resultado:
 *   put:
 *     tags: [Resultados de Recepción]
 *     summary: Actualizar el resultado de una recepción
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
 *               resultado:
 *                 type: string
 *                 example: APROBADO
 *               observaciones:
 *                 type: string
 *               fechaDecision:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Resultado actualizado
 *       404:
 *         description: Resultado no encontrado
 */

router.put(
  '/:recepcionId/resultado',
  permiso('Recepcion.Editar'),
  recepcionIdValidator,
  actualizarResultadoRecepcionValidator,
  validar,
  ctrl.actualizar,
);

// =====================================================
// ELIMINAR RESULTADO
// =====================================================

/**
 * @swagger
 * /api/recepciones/{recepcionId}/resultado:
 *   delete:
 *     tags: [Resultados de Recepción]
 *     summary: Eliminar el resultado de una recepción
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
 *         description: Resultado eliminado
 *       404:
 *         description: Resultado no encontrado
 */

router.delete(
  '/:recepcionId/resultado',
  permiso('Recepcion.Eliminar'),
  recepcionIdValidator,
  validar,
  ctrl.eliminar,
);

module.exports = router;
