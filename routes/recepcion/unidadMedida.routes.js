const { Router } = require('express');

const ctrl = require('../../controllers/recepcion/unidadMedida.controller');

const auth = require('../../middleware/auth');
const permiso = require('../../middleware/permiso');
const validar = require('../../middleware/validar');

const {
  idUnidadMedidaValidator,
  crearUnidadMedidaValidator,
  actualizarUnidadMedidaValidator
} = require('../../validators/maestro.validator');

const router = Router();

router.use(auth);

/**
 * @swagger
 * tags:
 *   name: Unidades de Medida
 *   description: Administración de unidades de medida
 */

/**
 * @swagger
 * /api/unidad-medida:
 *   get:
 *     tags: [Unidades de Medida]
 *     summary: Listar unidades de medida
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de unidades de medida
 */
router.get(
  '/',
  ctrl.listar
);

/**
 * @swagger
 * /api/unidad-medida/{id}:
 *   get:
 *     tags: [Unidades de Medida]
 *     summary: Obtener una unidad de medida por ID
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
 *         description: Unidad de medida encontrada
 *       404:
 *         description: Unidad de medida no encontrada
 */
router.get(
  '/:id',
  idUnidadMedidaValidator,
  validar,
  ctrl.obtener
);

/**
 * @swagger
 * /api/unidad-medida:
 *   post:
 *     tags: [Unidades de Medida]
 *     summary: Crear una unidad de medida
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - codigo
 *               - nombre
 *               - abreviatura
 *             properties:
 *               codigo:
 *                 type: string
 *                 example: KG
 *               nombre:
 *                 type: string
 *                 example: Kilogramo
 *               abreviatura:
 *                 type: string
 *                 example: kg
 *               descripcion:
 *                 type: string
 *                 example: Unidad de medida para peso
 *               estado:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Unidad de medida creada
 */
router.post(
  '/',
  crearUnidadMedidaValidator,
  validar,
  ctrl.crear
);

/**
 * @swagger
 * /api/unidad-medida/{id}:
 *   put:
 *     tags: [Unidades de Medida]
 *     summary: Actualizar una unidad de medida
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
 *             properties:
 *               codigo:
 *                 type: string
 *                 example: KG
 *               nombre:
 *                 type: string
 *                 example: Kilogramo
 *               abreviatura:
 *                 type: string
 *                 example: kg
 *               descripcion:
 *                 type: string
 *                 example: Unidad de medida para peso
 *               estado:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Unidad de medida actualizada
 *       404:
 *         description: Unidad de medida no encontrada
 */
router.put(
  '/:id',
  actualizarUnidadMedidaValidator,
  validar,
  ctrl.actualizar
);

/**
 * @swagger
 * /api/unidad-medida/{id}:
 *   delete:
 *     tags: [Unidades de Medida]
 *     summary: Eliminar una unidad de medida
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
 *         description: Unidad de medida eliminada
 *       404:
 *         description: Unidad de medida no encontrada
 */
router.delete(
  '/:id',
  idUnidadMedidaValidator,
  validar,
  ctrl.eliminar
);

module.exports = router;