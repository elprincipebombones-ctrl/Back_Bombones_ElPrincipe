const { Router } = require('express');
const ctrl = require('../../controllers/recepcion/lugarArea.controller');

const auth = require('../../middleware/auth');
const permiso = require('../../middleware/permiso');
const validar = require('../../middleware/validar');

const {
    idValidator
} = require('../../validators/maestro.validator');

const router = Router();

router.use(auth);

/**
 * @swagger
 * tags:
 *   name: Lugares / Áreas
 *   description: Administración de lugares o áreas
 */

/**
 * @swagger
 * /api/lugar-area:
 *   get:
 *     tags: [Lugares / Áreas]
 *     summary: Listar lugares o áreas
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de lugares o áreas
 */
router.get(
    '/',
    permiso('LugarArea.Ver'),
    ctrl.listar
);

/**
 * @swagger
 * /api/lugar-area/{id}:
 *   get:
 *     tags: [Lugares / Áreas]
 *     summary: Obtener un lugar o área por ID
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
 *         description: Lugar o área encontrado
 *       404:
 *         description: Lugar o área no encontrado
 */
router.get(
    '/:id',
    permiso('LugarArea.Ver'),
    idValidator,
    validar,
    ctrl.obtener
);

/**
 * @swagger
 * /api/lugar-area:
 *   post:
 *     tags: [Lugares / Áreas]
 *     summary: Crear un lugar o área
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
 *         description: Lugar o área creado
 */
router.post(
    '/',
    permiso('LugarArea.Crear'),
    ctrl.crear
);

/**
 * @swagger
 * /api/lugar-area/{id}:
 *   put:
 *     tags: [Lugares / Áreas]
 *     summary: Actualizar un lugar o área
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
 *         description: Lugar o área actualizado
 *       404:
 *         description: Lugar o área no encontrado
 */
router.put(
    '/:id',
    permiso('LugarArea.Editar'),
    idValidator,
    validar,
    ctrl.actualizar
);

/**
 * @swagger
 * /api/lugar-area/{id}:
 *   delete:
 *     tags: [Lugares / Áreas]
 *     summary: Eliminar un lugar o área
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
 *         description: Lugar o área eliminado
 *       404:
 *         description: Lugar o área no encontrado
 */
router.delete(
    '/:id',
    permiso('LugarArea.Eliminar'),
    idValidator,
    validar,
    ctrl.eliminar
);

module.exports = router;