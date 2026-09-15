const { Router } = require('express');

const ctrl = require('../../controllers/recepcion/recepcionVehiculo.controller');

const auth = require('../../middleware/auth');

const permiso = require('../../middleware/permiso');

const validar = require('../../middleware/validar');

const {
  recepcionIdValidator,
  idRecepcionVehiculoValidator,
  crearRecepcionVehiculoValidator,
  actualizarRecepcionVehiculoValidator,
} = require('../../validators/recepcion.validator');

const router = Router();

router.use(auth);

// =====================================================
// SWAGGER
// =====================================================

/**
 * @swagger
 * tags:
 *   name: Vehículos de Recepción
 *   description: Gestión de los vehículos asociados a una recepción
 */

// =====================================================
// LISTAR VEHÍCULOS DE UNA RECEPCIÓN
// =====================================================

/**
 * @swagger
 * /api/recepciones/{recepcionId}/vehiculos:
 *   get:
 *     tags: [Vehículos de Recepción]
 *     summary: Listar vehículos de una recepción
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recepcionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Lista de vehículos asociados a la recepción
 *       404:
 *         description: Recepción no encontrada
 */

router.get(
  '/:recepcionId/vehiculos',
  permiso('Recepcion.Ver'),
  recepcionIdValidator,
  validar,
  ctrl.listar,
);

// =====================================================
// OBTENER VEHÍCULO DE LA RECEPCIÓN
// =====================================================

/**
 * @swagger
 * /api/recepciones/{recepcionId}/vehiculos/{id}:
 *   get:
 *     tags: [Vehículos de Recepción]
 *     summary: Obtener un vehículo de una recepción
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recepcionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Vehículo de recepción encontrado
 *       404:
 *         description: Registro no encontrado
 */

router.get(
  '/:recepcionId/vehiculos/:id',
  permiso('Recepcion.Ver'),
  recepcionIdValidator,
  idRecepcionVehiculoValidator,
  validar,
  ctrl.obtener,
);

// =====================================================
// AGREGAR VEHÍCULO A LA RECEPCIÓN
// =====================================================

/**
 * @swagger
 * /api/recepciones/{recepcionId}/vehiculos:
 *   post:
 *     tags: [Vehículos de Recepción]
 *     summary: Asociar un vehículo registrado u ocasional a una recepción
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recepcionId
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
 *             properties:
 *               vehiculoId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: Requerido cuando se selecciona un vehículo registrado
 *               placa:
 *                 type: string
 *                 description: Requerida cuando se registra un vehículo ocasional
 *               tipoVehiculo:
 *                 type: string
 *               marca:
 *                 type: string
 *               modelo:
 *                 type: string
 *               guardarEnMaestro:
 *                 type: boolean
 *                 description: Crea el vehículo y lo asocia al proveedor de la recepción
 *               temperatura:
 *                 type: number
 *                 example: 4.50
 *               precinto:
 *                 type: string
 *                 example: PRE-001
 *               guiaTransporte:
 *                 type: string
 *                 example: GT-001
 *               hora:
 *                 type: string
 *                 example: 08:30:00
 *               vehiculoConductorOk:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Vehículo asociado correctamente
 *       404:
 *         description: Recepción o vehículo no encontrado
 */

router.post(
  '/:recepcionId/vehiculos',
  permiso('Recepcion.Crear'),
  recepcionIdValidator,
  crearRecepcionVehiculoValidator,
  validar,
  ctrl.crear,
);

// =====================================================
// ACTUALIZAR VEHÍCULO DE LA RECEPCIÓN
// =====================================================

/**
 * @swagger
 * /api/recepciones/{recepcionId}/vehiculos/{id}:
 *   put:
 *     tags: [Vehículos de Recepción]
 *     summary: Actualizar un vehículo de una recepción
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recepcionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *             properties:
 *               vehiculoId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               placa:
 *                 type: string
 *               tipoVehiculo:
 *                 type: string
 *               marca:
 *                 type: string
 *               modelo:
 *                 type: string
 *               guardarEnMaestro:
 *                 type: boolean
 *               temperatura:
 *                 type: number
 *               precinto:
 *                 type: string
 *               guiaTransporte:
 *                 type: string
 *               hora:
 *                 type: string
 *               vehiculoConductorOk:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Vehículo actualizado
 *       404:
 *         description: Registro no encontrado
 */

router.put(
  '/:recepcionId/vehiculos/:id',
  permiso('Recepcion.Editar'),
  recepcionIdValidator,
  idRecepcionVehiculoValidator,
  actualizarRecepcionVehiculoValidator,
  validar,
  ctrl.actualizar,
);

// =====================================================
// ELIMINAR VEHÍCULO DE LA RECEPCIÓN
// =====================================================

/**
 * @swagger
 * /api/recepciones/{recepcionId}/vehiculos/{id}:
 *   delete:
 *     tags: [Vehículos de Recepción]
 *     summary: Quitar un vehículo de una recepción sin eliminarlo del maestro
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recepcionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Asociación del vehículo retirada de la recepción
 *       404:
 *         description: Registro no encontrado
 */

router.delete(
  '/:recepcionId/vehiculos/:id',
  permiso('Recepcion.Editar'),
  recepcionIdValidator,
  idRecepcionVehiculoValidator,
  validar,
  ctrl.eliminar,
);

module.exports = router;
