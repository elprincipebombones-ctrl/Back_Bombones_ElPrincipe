const { Router } = require('express');
const { param } = require('express-validator');
const ctrl = require('../../controllers/recepcion/proveedores.controller');
const auth = require('../../middleware/auth');
const permiso = require('../../middleware/permiso');
const validar = require('../../middleware/validar');
const {
  crearTerceroValidator,
  actualizarTerceroValidator,
  idValidator,
} = require('../../validators/maestro.validator');
const storage = require('../../services/proveedores/almacenamiento-documentos.service');

const router = Router();
const multipart = (req, res, next) =>
  storage.upload(req, res, (error) => {
    if (error) return next(Object.assign(error, { status: error.status || 422 }));
    return next();
  });

router.use(auth);
router.get('/', permiso('Proveedores.Ver'), ctrl.listar);
router.get(
  '/:id/documentos/:documentoId/descarga',
  permiso('Proveedores.Ver'),
  idValidator,
  param('documentoId').isUUID(),
  validar,
  ctrl.descargar,
);
router.get('/:id', permiso('Proveedores.Ver'), idValidator, validar, ctrl.obtener);
router.post(
  '/',
  permiso('Proveedores.Crear'),
  multipart,
  crearTerceroValidator,
  validar,
  ctrl.crear,
);
router.put(
  '/:id',
  permiso('Proveedores.Editar'),
  multipart,
  actualizarTerceroValidator,
  validar,
  ctrl.actualizar,
);
router.delete('/:id', permiso('Proveedores.Eliminar'), idValidator, validar, ctrl.eliminar);

module.exports = router;
