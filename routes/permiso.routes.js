const { Router } = require('express');
const ctrl = require('../controllers/permiso.controller');
const auth = require('../middleware/auth');
const permiso = require('../middleware/permiso');
const validar = require('../middleware/validar');
const {
  crearPermisoValidator,
  actualizarPermisoValidator,
  idValidator,
} = require('../validators/permiso.validator');

const router = Router();

router.use(auth);

/**
 * @swagger
 * tags:
 *   name: Permisos
 *   description: Administración de permisos
 */

/**
 * @swagger
 * /api/permisos:
 *   get:
 *     tags: [Permisos]
 *     summary: Listar permisos
 *     security:
 *       - bearerAuth: []
 */
router.get('/', permiso('Permisos.Ver'), ctrl.listar);

/**
 * @swagger
 * /api/permisos/{id}:
 *   get:
 *     tags: [Permisos]
 *     summary: Obtener permiso
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
router.get('/:id', permiso('Permisos.Ver'), idValidator, validar, ctrl.obtener);

/**
 * @swagger
 * /api/permisos:
 *   post:
 *     tags: [Permisos]
 *     summary: Crear permiso
 *     security:
 *       - bearerAuth: []
 */
router.post('/', permiso('Permisos.Crear'), crearPermisoValidator, validar, ctrl.crear);

/**
 * @swagger
 * /api/permisos/{id}:
 *   put:
 *     tags: [Permisos]
 *     summary: Actualizar permiso
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
router.put('/:id', permiso('Permisos.Editar'), actualizarPermisoValidator, validar, ctrl.actualizar);

/**
 * @swagger
 * /api/permisos/{id}:
 *   delete:
 *     tags: [Permisos]
 *     summary: Eliminar permiso
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
router.delete('/:id', permiso('Permisos.Eliminar'), idValidator, validar, ctrl.eliminar);

module.exports = router;
