const { Router } = require('express');
const permiso = require('../../middleware/permiso');
const validar = require('../../middleware/validar');
const controller = require('../../controllers/produccion/solicitudes-mp.controller');
const validator = require('../../validators/produccion/solicitudes-mp.validator');

const router = Router();
// La autenticación se aplica en el router de Producción antes de montar estas rutas.
router.get(
  '/control/ordenes/:id/solicitudes-mp',
  permiso('produccion.control.ver'),
  validator.orden,
  validar,
  controller.historial,
);
router.get(
  '/control/ordenes/:id/solicitudes-mp/catalogos',
  permiso('produccion.control.editar'),
  validator.catalogos,
  validar,
  controller.catalogos,
);
router.post(
  '/control/ordenes/:id/solicitudes-mp',
  permiso('produccion.control.editar'),
  validator.crear,
  validar,
  controller.crear,
);
router.get(
  '/solicitudes-mp',
  permiso('produccion.ver', 'produccion.confirmar_salida_mp'),
  validator.listar,
  validar,
  controller.listar,
);
router.get(
  '/solicitudes-mp/:solicitudId',
  permiso('produccion.ver', 'produccion.confirmar_salida_mp'),
  validator.id,
  validar,
  controller.obtener,
);
router.post(
  '/solicitudes-mp/:solicitudId/resolver',
  permiso('produccion.confirmar_salida_mp'),
  validator.resolver,
  validar,
  controller.resolver,
);

module.exports = router;
