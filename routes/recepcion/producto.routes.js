
const { Router } = require('express');
const ctrl = require('../../controllers/recepcion/productos.controller');
const auth = require('../../middleware/auth');
const permiso = require('../../middleware/permiso');
const validar = require('../../middleware/validar');
const { crearProductoValidator, actualizarProductoValidator, idValidator } = require('../../validators/maestro.validator');

const router = Router();

router.use(auth);

/**
 * @swagger
 * tags:
 *   name: Productos
 *   description: Administración de productos
 */

/**
 * @swagger
 * /api/productos:
 *   get:
 *     tags: [Productos]
 *     summary: Listar productos
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de productos
 */
router.get('/', permiso('Productos.Ver'), ctrl.listar);

/**
 * @swagger
 * /api/productos/{id}:
 *   get:
 *     tags: [Productos]
 *     summary: Obtener un producto por ID
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
 *         description: Producto encontrado
 *       404:
 *         description: Producto no encontrado
 */
router.get(
  '/:id',
  permiso('Productos.Ver'),
  idValidator,
  validar,
  ctrl.obtener
);

/**
 * @swagger
 * /api/productos:
 *   post:
 *     tags: [Productos]
 *     summary: Crear un producto
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
 *         description: Producto creado
 */
router.post(
  '/',
  permiso('Productos.Crear'),
  ctrl.crear
);

/**
 * @swagger
 * /api/productos/{id}:
 *   put:
 *     tags: [Productos]
 *     summary: Actualizar un producto
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
 *         description: Producto actualizado
 *       404:
 *         description: Producto no encontrado
 */
router.put(
  '/:id',
  permiso('Productos.Editar'),
  idValidator,
  validar,
  ctrl.actualizar
);

/**
 * @swagger
 * /api/productos/{id}:
 *   delete:
 *     tags: [Productos]
 *     summary: Eliminar un producto
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
 *         description: Producto eliminado
 *       404:
 *         description: Producto no encontrado
 */
router.delete(
  '/:id',
  permiso('Productos.Eliminar'),
  idValidator,
  validar,
  ctrl.eliminar
);

module.exports = router;

