
const { Router } = require('express');
const ctrl = require('../../controllers/recepcion/materias-primas.controller');
const auth = require('../../middleware/auth');
const permiso = require('../../middleware/permiso');
const validar = require('../../middleware/validar');
const { crearMateriaPrimaValidator, actualizarMateriaPrimaValidator, idValidator } = require('../../validators/maestro.validator');
const router = Router();

router.use(auth);

/**
 * @swagger
 * tags:
 *   name: Materias Primas
 *   description: Administración de materias primas
 */

/**
 * @swagger
 * /api/materias-primas:
 *   get:
 *     tags: [Materias Primas]
 *     summary: Listar materias primas
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de materias primas
 */
router.get(
    '/',
    permiso('MateriasPrimas.Ver'),
    ctrl.listar
);

/**
 * @swagger
 * /api/materias-primas/{id}:
 *   get:
 *     tags: [Materias Primas]
 *     summary: Obtener una materia prima por ID
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
 *         description: Materia prima encontrada
 *       404:
 *         description: Materia prima no encontrada
 */
router.get(
    '/:id',
    permiso('MateriasPrimas.Ver'),
    idValidator,
    validar,
    ctrl.obtener
);

/**
 * @swagger
 * /api/materias-primas:
 *   post:
 *     tags: [Materias Primas]
 *     summary: Crear una materia prima
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
 *         description: Materia prima creada
 */
router.post(
    '/',
    permiso('MateriasPrimas.Crear'),
    ctrl.crear
);

/**
 * @swagger
 * /api/materias-primas/{id}:
 *   put:
 *     tags: [Materias Primas]
 *     summary: Actualizar una materia prima
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
 *         description: Materia prima actualizada
 *       404:
 *         description: Materia prima no encontrada
 */
router.put(
    '/:id',
    permiso('MateriasPrimas.Editar'),
    idValidator,
    validar,
    ctrl.actualizar
);

/**
 * @swagger
 * /api/materias-primas/{id}:
 *   delete:
 *     tags: [Materias Primas]
 *     summary: Eliminar una materia prima
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
 *         description: Materia prima eliminada
 *       404:
 *         description: Materia prima no encontrada
 */
router.delete(
    '/:id',
    permiso('MateriasPrimas.Eliminar'),
    idValidator,
    validar,
    ctrl.eliminar
);

module.exports = router;

