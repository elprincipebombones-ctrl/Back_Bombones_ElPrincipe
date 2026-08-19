const { Router } = require('express');

const ctrl = require('../../controllers/recepcion/recepcion.controller');

const auth = require('../../middleware/auth');
const permiso = require('../../middleware/permiso');
const validar = require('../../middleware/validar');

const {
  idRecepcionValidator,
  crearRecepcionValidator,
  actualizarRecepcionValidator
} = require('../../validators/maestro.validator');

const router = Router();

router.use(auth);


console.log('=== RECEPCION ROUTES ===');

console.log('Validators:', {
  idRecepcionValidator,
  crearRecepcionValidator,
  actualizarRecepcionValidator
});

console.log('Controller:', {
  listar: ctrl.getAll,
  obtener: ctrl.getById,
  crear: ctrl.create,
  actualizar: ctrl.update,
  eliminar: ctrl.delete
});
/**
 * @swagger
 * tags:
 *   name: Recepciones
 *   description: Gestión de recepción de productos y materias primas
 */

/**
 * @swagger
 * /api/recepciones:
 *   get:
 *     tags: [Recepciones]
 *     summary: Listar recepciones
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de recepciones
 */
router.get(
  '/',
  permiso('Recepcion.Ver'),
  ctrl.getAll
);

/**
 * @swagger
 * /api/recepciones/{id}:
 *   get:
 *     tags: [Recepciones]
 *     summary: Obtener una recepción por ID
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
 *         description: Recepción encontrada
 *       404:
 *         description: Recepción no encontrada
 */
router.get(
  '/:id',
  permiso('Recepcion.Ver'),
  idRecepcionValidator,
  validar,
  ctrl.getById
);

/**
 * @swagger
 * /api/recepciones:
 *   post:
 *     tags: [Recepciones]
 *     summary: Crear una recepción
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - numeroRecepcion
 *               - tipoRecepcion
 *               - fechaRecepcion
 *               - proveedorId
 *             properties:
 *               numeroRecepcion:
 *                 type: string
 *                 example: REC-000001
 *               tipoRecepcion:
 *                 type: string
 *                 example: COMPRA
 *               fechaRecepcion:
 *                 type: string
 *                 format: date
 *                 example: 2026-08-15
 *               horaRecepcion:
 *                 type: string
 *                 example: 08:30:00
 *               proveedorId:
 *                 type: string
 *                 format: uuid
 *               lugarAreaId:
 *                 type: string
 *                 format: uuid
 *               lote:
 *                 type: string
 *                 example: LOT-001
 *               observaciones:
 *                 type: string
 *               estado:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Recepción creada
 */
router.post(
  '/',
  permiso('Recepcion.Crear'),
  crearRecepcionValidator,
  validar,
  ctrl.create
);

/**
 * @swagger
 * /api/recepciones/{id}:
 *   put:
 *     tags: [Recepciones]
 *     summary: Actualizar una recepción
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
 *         description: Recepción actualizada
 *       404:
 *         description: Recepción no encontrada
 */
router.put(
  '/:id',
  permiso('Recepcion.Editar'),
  idRecepcionValidator,
  actualizarRecepcionValidator,
  validar,
  ctrl.update
);

/**
 * @swagger
 * /api/recepciones/{id}:
 *   delete:
 *     tags: [Recepciones]
 *     summary: Eliminar una recepción
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
 *         description: Recepción eliminada
 *       404:
 *         description: Recepción no encontrada
 */
router.delete(
  '/:id',
  permiso('Recepcion.Eliminar'),
  idRecepcionValidator,
  validar,
  ctrl.delete
);

module.exports = router;