const { Router } = require('express');
const ctrl = require('../../controllers/recepcion/vehiculo.controller');

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
 *   name: Vehículos
 *   description: Administración de vehículos
 */

/**
 * @swagger
 * /api/vehiculos:
 *   get:
 *     tags: [Vehículos]
 *     summary: Listar vehículos
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de vehículos
 */
router.get(
    '/',
    permiso('Vehiculos.Ver'),
    ctrl.listar
);

/**
 * @swagger
 * /api/vehiculos/{id}:
 *   get:
 *     tags: [Vehículos]
 *     summary: Obtener vehículo por ID
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
 *         description: Vehículo encontrado
 *       404:
 *         description: Vehículo no encontrado
 */
router.get(
    '/:id',
    permiso('Vehiculos.Ver'),
    idValidator,
    validar,
    ctrl.obtener
);

/**
 * @swagger
 * /api/vehiculos:
 *   post:
 *     tags: [Vehículos]
 *     summary: Crear vehículo
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
 *         description: Vehículo creado
 */
router.post(
    '/',
    permiso('Vehiculos.Crear'),
    ctrl.crear
);

/**
 * @swagger
 * /api/vehiculos/{id}:
 *   put:
 *     tags: [Vehículos]
 *     summary: Actualizar vehículo
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
 *         description: Vehículo actualizado
 *       404:
 *         description: Vehículo no encontrado
 */
router.put(
    '/:id',
    permiso('Vehiculos.Editar'),
    idValidator,
    validar,
    ctrl.actualizar
);

/**
 * @swagger
 * /api/vehiculos/{id}:
 *   delete:
 *     tags: [Vehículos]
 *     summary: Eliminar vehículo
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
 *         description: Vehículo eliminado
 *       404:
 *         description: Vehículo no encontrado
 */
router.delete(
    '/:id',
    permiso('Vehiculos.Eliminar'),
    idValidator,
    validar,
    ctrl.eliminar
);

module.exports = router;