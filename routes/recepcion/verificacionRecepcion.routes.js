const { Router } = require('express');

const ctrl = require('../../controllers/recepcion/verificacionRecepcion.controller');

const auth = require('../../middleware/auth');
const permiso = require('../../middleware/permiso');
const validar = require('../../middleware/validar');

const {
  recepcionIdValidator,
  crearVerificacionRecepcionValidator,
  actualizarVerificacionRecepcionValidator,
} = require('../../validators/recepcion.validator');

const router = Router();

router.use(auth);

// =====================================================
// SWAGGER
// =====================================================

/**
 * @swagger
 * tags:
 *   name: Verificación de Recepción
 *   description: Verificación de las condiciones del producto recibido
 */

// =====================================================
// OBTENER VERIFICACIÓN
// =====================================================

/**
 * @swagger
 * /api/recepciones/{recepcionId}/verificacion:
 *   get:
 *     tags: [Verificación de Recepción]
 *     summary: Obtener la verificación de una recepción
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
 *         description: Verificación encontrada
 *       404:
 *         description: Verificación no encontrada
 */

router.get(
  '/:recepcionId/verificacion',
  permiso('Recepcion.Ver'),
  recepcionIdValidator,
  validar,
  ctrl.obtener,
);

// =====================================================
// CREAR VERIFICACIÓN
// =====================================================

/**
 * @swagger
 * /api/recepciones/{recepcionId}/verificacion:
 *   post:
 *     tags: [Verificación de Recepción]
 *     summary: Crear la verificación de una recepción
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
 *               certificadoCalidad:
 *                 type: boolean
 *                 example: true
 *               plagas:
 *                 type: boolean
 *                 example: false
 *               rotuladoCorrecto:
 *                 type: boolean
 *                 example: true
 *               condicionesEmbalaje:
 *                 type: boolean
 *                 example: true
 *               aparienciaColorTextura:
 *                 type: boolean
 *                 example: true
 *               empaqueEmbalaje:
 *                 type: boolean
 *                 example: true
 *               olor:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Verificación creada
 *       409:
 *         description: La recepción ya tiene una verificación
 */

router.post(
  '/:recepcionId/verificacion',
  permiso('Recepcion.Crear'),
  recepcionIdValidator,
  crearVerificacionRecepcionValidator,
  validar,
  ctrl.crear,
);

// =====================================================
// ACTUALIZAR VERIFICACIÓN
// =====================================================

/**
 * @swagger
 * /api/recepciones/{recepcionId}/verificacion:
 *   put:
 *     tags: [Verificación de Recepción]
 *     summary: Actualizar la verificación de una recepción
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
 *               certificadoCalidad:
 *                 type: boolean
 *               plagas:
 *                 type: boolean
 *               rotuladoCorrecto:
 *                 type: boolean
 *               condicionesEmbalaje:
 *                 type: boolean
 *               aparienciaColorTextura:
 *                 type: boolean
 *               empaqueEmbalaje:
 *                 type: boolean
 *               olor:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Verificación actualizada
 *       404:
 *         description: Verificación no encontrada
 */

router.put(
  '/:recepcionId/verificacion',
  permiso('Recepcion.Editar'),
  recepcionIdValidator,
  actualizarVerificacionRecepcionValidator,
  validar,
  ctrl.actualizar,
);

// =====================================================
// ELIMINAR VERIFICACIÓN
// =====================================================

/**
 * @swagger
 * /api/recepciones/{recepcionId}/verificacion:
 *   delete:
 *     tags: [Verificación de Recepción]
 *     summary: Eliminar la verificación de una recepción
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
 *         description: Verificación eliminada
 *       404:
 *         description: Verificación no encontrada
 */

router.delete(
  '/:recepcionId/verificacion',
  permiso('Recepcion.Eliminar'),
  recepcionIdValidator,
  validar,
  ctrl.eliminar,
);

module.exports = router;
