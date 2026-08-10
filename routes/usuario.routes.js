const { Router } = require('express');
const ctrl = require('../controllers/usuario.controller');
const auth = require('../middleware/auth');
const permiso = require('../middleware/permiso');
const validar = require('../middleware/validar');
const {
  crearUsuarioValidator,
  actualizarUsuarioValidator,
  idValidator,
} = require('../validators/usuario.validator');

const router = Router();

/**
 * @swagger
 * tags: [{ name: Usuarios }]
 */

router.use(auth);

/**
 * @swagger
 * tags:
 *   name: Usuarios
 *   description: Administración de usuarios
 */

/**
 * @swagger
 * /api/usuarios:
 *   get:
 *     tags: [Usuarios]
 *     summary: Listar usuarios
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuarios
 */
router.get('/', permiso('Usuarios.Ver'), ctrl.listar);

/**
 * @swagger
 * /api/usuarios/{id}:
 *   get:
 *     tags: [Usuarios]
 *     summary: Obtener un usuario por ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Usuario encontrado
 *       404:
 *         description: Usuario no encontrado
 */
router.get('/:id', permiso('Usuarios.Ver'), idValidator, validar, ctrl.obtener);

/**
 * @swagger
 * /api/usuarios:
 *   post:
 *     tags: [Usuarios]
 *     summary: Crear un usuario
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
 *         description: Usuario creado
 */
router.post('/', permiso('Usuarios.Crear'), crearUsuarioValidator, validar, ctrl.crear);

/**
 * @swagger
 * /api/usuarios/{id}:
 *   put:
 *     tags: [Usuarios]
 *     summary: Actualizar un usuario
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *     responses:
 *       200:
 *         description: Usuario actualizado
 */
router.put('/:id', permiso('Usuarios.Editar'), actualizarUsuarioValidator, validar, ctrl.actualizar);

/**
 * @swagger
 * /api/usuarios/{id}:
 *   delete:
 *     tags: [Usuarios]
 *     summary: Eliminar un usuario
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Usuario eliminado
 */
router.delete('/:id', permiso('Usuarios.Eliminar'), idValidator, validar, ctrl.eliminar);

module.exports = router;
