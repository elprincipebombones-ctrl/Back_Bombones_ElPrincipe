const { Router } = require('express');
const { param } = require('express-validator');
const ctrl = require('../../controllers/recepcion/proveedores.controller');
const auth = require('../../middleware/auth');
const permiso = require('../../middleware/permiso');
const validar = require('../../middleware/validar');
const { crearProveedorValidator, actualizarProveedorValidator, idValidator } = require('../../validators/maestro.validator');
const router = Router();
const documentos = require('../../services/proveedores/almacenamiento-documentos.service');
const multipart = (req, res, next) => documentos.upload(req, res, (err) => err ? next(Object.assign(err, { status: err.status || 422 })) : next());

router.use(auth);

/**
 * @swagger
 * tags:
 *   name: Proveedores
 *   description: Administración de proveedores
 */

/**
 * @swagger
 * /api/proveedores:
 *   get:
 *     tags: [Proveedores]
 *     summary: Listar proveedores
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de proveedores
 */
router.get(
    '/',
    permiso('Proveedores.Ver'),
    ctrl.listar
);

/**
 * @swagger
 * /api/proveedores/{id}:
 *   get:
 *     tags: [Proveedores]
 *     summary: Obtener un proveedor por ID
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
 *         description: Proveedor encontrado
 *       404:
 *         description: Proveedor no encontrado
 */
router.get('/:id/documentos/:documentoId/descarga', permiso('Proveedores.Ver'), idValidator, param('documentoId').isUUID(), validar, ctrl.descargar);
router.get(
    '/:id',
    permiso('Proveedores.Ver'),
    idValidator,
    validar,
    ctrl.obtener
);

/**
 * @swagger
 * /api/proveedores:
 *   post:
 *     tags: [Proveedores]
 *     summary: Crear un proveedor
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               camaraComercio: { type: string, format: binary }
 *               rut: { type: string, format: binary }
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Proveedor creado
 */
router.post(
    '/',
    permiso('Proveedores.Crear'),
    multipart,
    crearProveedorValidator,
    validar,
    ctrl.crear
);

/**
 * @swagger
 * /api/proveedores/{id}:
 *   put:
 *     tags: [Proveedores]
 *     summary: Actualizar un proveedor
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               camaraComercio: { type: string, format: binary }
 *               rut: { type: string, format: binary }
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Proveedor actualizado
 *       404:
 *         description: Proveedor no encontrado
 */
router.put(
    '/:id',
    permiso('Proveedores.Editar'),
    multipart,
    actualizarProveedorValidator,
    validar,
    ctrl.actualizar
);

/**
 * @swagger
 * /api/proveedores/{id}:
 *   delete:
 *     tags: [Proveedores]
 *     summary: Eliminar un proveedor
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
 *         description: Proveedor eliminado
 *       404:
 *         description: Proveedor no encontrado
 */
router.delete(
    '/:id',
    permiso('Proveedores.Eliminar'),
    idValidator,
    validar,
    ctrl.eliminar
);

module.exports = router;
