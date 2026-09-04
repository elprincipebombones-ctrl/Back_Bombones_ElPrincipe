const { Router } = require('express');

const ctrl = require('../../controllers/recepcion/temperaturaRecepcion.controller');

const auth = require('../../middleware/auth');
const permiso = require('../../middleware/permiso');
const validar = require('../../middleware/validar');

const {
  recepcionIdValidator,
  idTemperaturaRecepcionValidator,
  crearTemperaturaRecepcionValidator,
  actualizarTemperaturaRecepcionValidator,
} = require('../../validators/recepcion.validator');

const router = Router();

router.use(auth);

// =====================================================
// SWAGGER
// =====================================================

/**
 * @swagger
 * tags:
 *   name: Temperaturas de Recepción
 *   description: Registro de temperaturas de los productos recibidos
 */

// =====================================================
// LISTAR TEMPERATURAS
// =====================================================

/**
 * @swagger
 * /api/recepciones/{recepcionId}/temperaturas:
 *   get:
 *     tags: [Temperaturas de Recepción]
 *     summary: Listar temperaturas de una recepción
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
 *         description: Lista de temperaturas
 *       404:
 *         description: Recepción no encontrada
 */

router.get(
  '/:recepcionId/temperaturas',
  permiso('Recepcion.Ver'),
  recepcionIdValidator,
  validar,
  ctrl.listar,
);

// =====================================================
// OBTENER TEMPERATURA
// =====================================================

/**
 * @swagger
 * /api/recepciones/{recepcionId}/temperaturas/{id}:
 *   get:
 *     tags: [Temperaturas de Recepción]
 *     summary: Obtener una temperatura de recepción
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recepcionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Temperatura encontrada
 *       404:
 *         description: Temperatura no encontrada
 */

router.get(
  '/:recepcionId/temperaturas/:id',
  permiso('Recepcion.Ver'),
  recepcionIdValidator,
  idTemperaturaRecepcionValidator,
  validar,
  ctrl.obtener,
);

// =====================================================
// CREAR TEMPERATURA
// =====================================================

/**
 * @swagger
 * /api/recepciones/{recepcionId}/temperaturas:
 *   post:
 *     tags: [Temperaturas de Recepción]
 *     summary: Registrar temperatura de un producto
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
 *               - productoId
 *               - temperatura
 *             properties:
 *               productoId:
 *                 type: string
 *                 format: uuid
 *               temperatura:
 *                 type: number
 *                 example: 4.50
 *               hora:
 *                 type: string
 *                 example: 08:30:00
 *               observaciones:
 *                 type: string
 *     responses:
 *       201:
 *         description: Temperatura registrada
 *       404:
 *         description: Recepción o producto no encontrado
 */

router.post(
  '/:recepcionId/temperaturas',
  permiso('Recepcion.Crear'),
  recepcionIdValidator,
  crearTemperaturaRecepcionValidator,
  validar,
  ctrl.crear,
);

// =====================================================
// ACTUALIZAR TEMPERATURA
// =====================================================

/**
 * @swagger
 * /api/recepciones/{recepcionId}/temperaturas/{id}:
 *   put:
 *     tags: [Temperaturas de Recepción]
 *     summary: Actualizar una temperatura
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recepcionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *             properties:
 *               productoId:
 *                 type: string
 *                 format: uuid
 *               temperatura:
 *                 type: number
 *               hora:
 *                 type: string
 *               observaciones:
 *                 type: string
 *     responses:
 *       200:
 *         description: Temperatura actualizada
 *       404:
 *         description: Temperatura no encontrada
 */

router.put(
  '/:recepcionId/temperaturas/:id',
  permiso('Recepcion.Editar'),
  recepcionIdValidator,
  idTemperaturaRecepcionValidator,
  actualizarTemperaturaRecepcionValidator,
  validar,
  ctrl.actualizar,
);

// =====================================================
// ELIMINAR TEMPERATURA
// =====================================================

/**
 * @swagger
 * /api/recepciones/{recepcionId}/temperaturas/{id}:
 *   delete:
 *     tags: [Temperaturas de Recepción]
 *     summary: Eliminar una temperatura
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recepcionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Temperatura eliminada
 *       404:
 *         description: Temperatura no encontrada
 */

router.delete(
  '/:recepcionId/temperaturas/:id',
  permiso('Recepcion.Eliminar'),
  recepcionIdValidator,
  idTemperaturaRecepcionValidator,
  validar,
  ctrl.eliminar,
);

module.exports = router;
