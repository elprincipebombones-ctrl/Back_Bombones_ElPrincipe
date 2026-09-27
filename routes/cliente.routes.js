const { Router } = require('express');
const { param } = require('express-validator');
const auth = require('../middleware/auth');
const permiso = require('../middleware/permiso');
const validar = require('../middleware/validar');
const ctrl = require('../controllers/cliente.controller');
const val = require('../validators/cliente.validator');
const storage = require('../services/proveedores/almacenamiento-documentos.service');
const router = Router();
router.use(auth);
const multipart = (req, res, next) =>
  storage.upload(req, res, (e) =>
    e ? next(Object.assign(e, { status: e.status || 422 })) : next(),
  );
router.get('/', permiso('Clientes.Ver'), ctrl.listar);
router.get(
  '/:id/documentos/:documentoId/descarga',
  permiso('Clientes.Ver'),
  ...val.id,
  param('documentoId').isUUID(),
  validar,
  ctrl.descargar,
);
router.get('/:id', permiso('Clientes.Ver'), ...val.id, validar, ctrl.obtener);
router.post('/', permiso('Clientes.Crear'), multipart, ...val.crear, validar, ctrl.crear);
router.put(
  '/:id',
  permiso('Clientes.Editar'),
  multipart,
  ...val.actualizar,
  validar,
  ctrl.actualizar,
);
router.delete('/:id', permiso('Clientes.Eliminar'), ...val.id, validar, ctrl.eliminar);
module.exports = router;
