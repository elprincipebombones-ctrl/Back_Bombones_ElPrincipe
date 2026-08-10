const { Router } = require('express');
const ctrl = require('../controllers/rol.controller');
const auth = require('../middleware/auth');
const permiso = require('../middleware/permiso');
const validar = require('../middleware/validar');
const {
  crearRolValidator,
  actualizarRolValidator,
  idValidator,
} = require('../validators/rol.validator');

const router = Router();

router.use(auth);

/**
 * @swagger
 * tags:
 *   name: Roles
 *   description: Administración de roles
 */

/**
 * @swagger
 * /api/roles:
 *   get:
 *     tags: [Roles]
 *     summary: Listar roles
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de roles
 */
router.get('/', permiso('Roles.Ver'), ctrl.listar);

/**
 * @swagger
 * /api/roles/{id}:
 *   get:
 *     tags: [Roles]
 *     summary: Obtener un rol
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
router.get('/:id', permiso('Roles.Ver'), idValidator, validar, ctrl.obtener);

/**
 * @swagger
 * /api/roles:
 *   post:
 *     tags: [Roles]
 *     summary: Crear rol
 *     security:
 *       - bearerAuth: []
 */
router.post('/', permiso('Roles.Crear'), crearRolValidator, validar, ctrl.crear);

/**
 * @swagger
 * /api/roles/{id}:
 *   put:
 *     tags: [Roles]
 *     summary: Actualizar rol
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
router.put('/:id', permiso('Roles.Editar'), actualizarRolValidator, validar, ctrl.actualizar);

/**
 * @swagger
 * /api/roles/{id}:
 *   delete:
 *     tags: [Roles]
 *     summary: Eliminar rol
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
router.delete('/:id', permiso('Roles.Eliminar'), idValidator, validar, ctrl.eliminar);

module.exports = router;
