const { Router } = require('express');

const ctrl = require('../../controllers/recepcion/categoriaProducto.controller');

const auth = require('../../middleware/auth');
const permiso = require('../../middleware/permiso');
const validar = require('../../middleware/validar');

const {
  idCategoriaProductoValidator,
  crearCategoriaProductoValidator,
  actualizarCategoriaProductoValidator
} = require('../../validators/maestro.validator');

const router = Router();

router.use(auth);

/**
 * @swagger
 * tags:
 *   name: Categorías de Productos
 *   description: Administración de categorías de productos
 */

/**
 * @swagger
 * /api/categoria-producto:
 *   get:
 *     tags: [Categorías de Productos]
 *     summary: Listar categorías de productos
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de categorías de productos
 */
router.get(
  '/',
  permiso('CategoriaProducto.Ver'),
  ctrl.listar
);

/**
 * @swagger
 * /api/categoria-producto/{id}:
 *   get:
 *     tags: [Categorías de Productos]
 *     summary: Obtener una categoría de producto por ID
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
 *         description: Categoría de producto encontrada
 *       404:
 *         description: Categoría de producto no encontrada
 */
router.get(
  '/:id',
  permiso('CategoriaProducto.Ver'),
  idCategoriaProductoValidator,
  validar,
  ctrl.obtener
);

/**
 * @swagger
 * /api/categoria-producto:
 *   post:
 *     tags: [Categorías de Productos]
 *     summary: Crear una categoría de producto
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - codigo
 *             properties:
 *               codigo:
 *                 type: string
 *                 example: MP-CAR
 *               nombre:
 *                 type: string
 *                 example: Materia Prima Cárnica
 *               descripcion:
 *                 type: string
 *                 example: Productos de origen cárnico
 *               estado:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Categoría de producto creada
 */
router.post(
  '/',
  permiso('CategoriaProducto.Crear'),
  crearCategoriaProductoValidator,
  validar,
  ctrl.crear
);

/**
 * @swagger
 * /api/categoria-producto/{id}:
 *   put:
 *     tags: [Categorías de Productos]
 *     summary: Actualizar una categoría de producto
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
 *         description: Categoría de producto actualizada
 *       404:
 *         description: Categoría de producto no encontrada
 */
router.put(
  '/:id',
  permiso('CategoriaProducto.Editar'),
  actualizarCategoriaProductoValidator,
  validar,
  ctrl.actualizar
);

/**
 * @swagger
 * /api/categoria-producto/{id}:
 *   delete:
 *     tags: [Categorías de Productos]
 *     summary: Eliminar una categoría de producto
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
 *         description: Categoría de producto eliminada
 *       404:
 *         description: Categoría de producto no encontrada
 */
router.delete(
  '/:id',
  permiso('CategoriaProducto.Eliminar'),
  idCategoriaProductoValidator,
  validar,
  ctrl.eliminar
);

module.exports = router;