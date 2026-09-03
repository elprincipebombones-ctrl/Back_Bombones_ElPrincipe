const { Router } = require('express');

const ctrl = require('../../controllers/recepcion/detalleRecepcion.controller');

const auth = require('../../middleware/auth');

const permiso = require('../../middleware/permiso');

const validar = require('../../middleware/validar');

const {
  idRecepcionValidator,
  idDetalleRecepcionValidator,
  crearDetalleRecepcionValidator,
  actualizarDetalleRecepcionValidator
} = require('../../validators/maestro.validator');

const router = Router();

router.use(auth);


// =====================================================
// SWAGGER
// =====================================================

/**
 * @swagger
 * tags:
 *   name: Detalles de Recepción
 *   description: Gestión de los productos recibidos en una recepción
 */


// =====================================================
// LISTAR DETALLES DE UNA RECEPCIÓN
// =====================================================

/**
 * @swagger
 * /api/recepciones/{recepcionId}/detalles:
 *   get:
 *     tags: [Detalles de Recepción]
 *     summary: Listar detalles de una recepción
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
 *         description: Lista de detalles de la recepción
 *       404:
 *         description: Recepción no encontrada
 */

router.get(
  '/:recepcionId/detalles',
  permiso('Recepcion.Ver'),
  idRecepcionValidator,
  validar,
  ctrl.listar
);


// =====================================================
// OBTENER DETALLE
// =====================================================

/**
 * @swagger
 * /api/recepciones/{recepcionId}/detalles/{id}:
 *   get:
 *     tags: [Detalles de Recepción]
 *     summary: Obtener un detalle de recepción
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
 *         description: Detalle encontrado
 *       404:
 *         description: Detalle no encontrado
 */

router.get(
  '/:recepcionId/detalles/:id',
  permiso('Recepcion.Ver'),
  idRecepcionValidator,
  idDetalleRecepcionValidator,
  validar,
  ctrl.obtener
);


// =====================================================
// CREAR DETALLE
// =====================================================

/**
 * @swagger
 * /api/recepciones/{recepcionId}/detalles:
 *   post:
 *     tags: [Detalles de Recepción]
 *     summary: Agregar un producto a una recepción
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
 *               - unidadMedidaId
 *               - cantidad
 *             properties:
 *               productoId:
 *                 type: string
 *                 format: uuid
 *               unidadMedidaId:
 *                 type: string
 *                 format: uuid
 *               cantidad:
 *                 type: number
 *                 example: 100.500
 *               lote:
 *                 type: string
 *                 example: LOT-001
 *               fechaVencimiento:
 *                 type: string
 *                 format: date
 *                 example: 2026-12-31
 *               observaciones:
 *                 type: string
 *     responses:
 *       201:
 *         description: Detalle creado
 *       404:
 *         description: Recepción, producto o unidad de medida no encontrada
 */

router.post(
  '/:recepcionId/detalles',
  permiso('Recepcion.Crear'),
  idRecepcionValidator,
  crearDetalleRecepcionValidator,
  validar,
  ctrl.crear
);


// =====================================================
// ACTUALIZAR DETALLE
// =====================================================

/**
 * @swagger
 * /api/recepciones/{recepcionId}/detalles/{id}:
 *   put:
 *     tags: [Detalles de Recepción]
 *     summary: Actualizar un detalle de recepción
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
 *               unidadMedidaId:
 *                 type: string
 *                 format: uuid
 *               cantidad:
 *                 type: number
 *               lote:
 *                 type: string
 *               fechaVencimiento:
 *                 type: string
 *                 format: date
 *               observaciones:
 *                 type: string
 *     responses:
 *       200:
 *         description: Detalle actualizado
 *       404:
 *         description: Detalle no encontrado
 */

router.put(
  '/:recepcionId/detalles/:id',
  permiso('Recepcion.Editar'),
  idRecepcionValidator,
  idDetalleRecepcionValidator,
  actualizarDetalleRecepcionValidator,
  validar,
  ctrl.actualizar
);


// =====================================================
// ELIMINAR DETALLE
// =====================================================

/**
 * @swagger
 * /api/recepciones/{recepcionId}/detalles/{id}:
 *   delete:
 *     tags: [Detalles de Recepción]
 *     summary: Eliminar un detalle de recepción
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
 *         description: Detalle eliminado
 *       404:
 *         description: Detalle no encontrado
 */

router.delete(
  '/:recepcionId/detalles/:id',
  permiso('Recepcion.Eliminar'),
  idRecepcionValidator,
  idDetalleRecepcionValidator,
  validar,
  ctrl.eliminar
);


module.exports = router;