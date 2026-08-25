const { Router } = require('express');

const ctrl = require('../../controllers/Inventario/bodega.controller');

const auth = require('../../middleware/auth');
const permiso = require('../../middleware/permiso');
const validar = require('../../middleware/validar');

const {
  crearBodegaValidator,
  actualizarBodegaValidator,
  idValidator
} = require('../../validators/maestro.validator');

const router = Router();

router.use(auth);

/**
 * @swagger
 * tags:
 *   name: Bodegas
 *   description: Administración de bodegas
 */

/**
 * @swagger
 * /api/bodegas:
 *   get:
 *     tags: [Bodegas]
 *     summary: Listar bodegas
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de bodegas
 */
router.get(
  '/',
  permiso('Bodegas.Ver'),
  ctrl.listar
);

/**
 * @swagger
 * /api/bodegas/{id}:
 *   get:
 *     tags: [Bodegas]
 *     summary: Obtener una bodega por ID
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
 *         description: Bodega encontrada
 *       404:
 *         description: Bodega no encontrada
 */
router.get(
  '/:id',
  permiso('Bodegas.Ver'),
  idValidator,
  validar,
  ctrl.obtener
);

/**
 * @swagger
 * /api/bodegas:
 *   post:
 *     tags: [Bodegas]
 *     summary: Crear una bodega
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Bodega creada
 */
router.post(
  '/',
  permiso('Bodegas.Crear'),
  crearBodegaValidator,
  validar,
  ctrl.crear
);

/**
 * @swagger
 * /api/bodegas/{id}:
 *   put:
 *     tags: [Bodegas]
 *     summary: Actualizar una bodega
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
 *         description: Bodega actualizada
 *       404:
 *         description: Bodega no encontrada
 */
router.put(
  '/:id',
  permiso('Bodegas.Editar'),
  idValidator,
  actualizarBodegaValidator,
  validar,
  ctrl.actualizar
);

/**
 * @swagger
 * /api/bodegas/{id}:
 *   delete:
 *     tags: [Bodegas]
 *     summary: Eliminar una bodega
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
 *         description: Bodega eliminada
 *       404:
 *         description: Bodega no encontrada
 */
router.delete(
  '/:id',
  permiso('Bodegas.Eliminar'),
  idValidator,
  validar,
  ctrl.eliminar
);

module.exports = router;