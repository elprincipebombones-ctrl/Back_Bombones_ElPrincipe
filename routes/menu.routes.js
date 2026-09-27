const { Router } = require('express');
const ctrl = require('../controllers/menu.controller');
const auth = require('../middleware/auth');
const permiso = require('../middleware/permiso');
const validar = require('../middleware/validar');
const {
  crearMenuValidator,
  actualizarMenuValidator,
  idValidator,
} = require('../validators/menu.validator');

const router = Router();

router.use(auth);

/**
 * @swagger
 * tags:
 *   name: Menús
 *   description: Administración de menús
 */

/**
 * @swagger
 * /api/menus:
 *   get:
 *     tags: [Menús]
 *     summary: Listar menús
 *     security:
 *       - bearerAuth: []
 */
router.get('/', permiso('Menus.Ver'), ctrl.listar);

/**
 * @swagger
 * /api/menus/{id}:
 *   get:
 *     tags: [Menús]
 *     summary: Obtener menú
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
router.get('/:id', permiso('Menus.Ver'), idValidator, validar, ctrl.obtener);

/**
 * @swagger
 * /api/menus:
 *   post:
 *     tags: [Menús]
 *     summary: Crear menú
 *     security:
 *       - bearerAuth: []
 */
router.post('/', permiso('Menus.Crear'), crearMenuValidator, validar, ctrl.crear);

/**
 * @swagger
 * /api/menus/{id}:
 *   put:
 *     tags: [Menús]
 *     summary: Actualizar menú
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
router.put('/:id', permiso('Menus.Editar'), actualizarMenuValidator, validar, ctrl.actualizar);

/**
 * @swagger
 * /api/menus/{id}:
 *   delete:
 *     tags: [Menús]
 *     summary: Eliminar menú
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
router.delete('/:id', permiso('Menus.Eliminar'), idValidator, validar, ctrl.eliminar);

module.exports = router;
