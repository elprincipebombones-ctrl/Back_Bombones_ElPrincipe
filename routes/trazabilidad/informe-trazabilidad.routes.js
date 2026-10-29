const { Router } = require('express');
const auth = require('../../middleware/auth');
const permiso = require('../../middleware/permiso');
const validar = require('../../validators/trazabilidad/informe-trazabilidad.validator');
const controller = require('../../controllers/trazabilidad/informe-trazabilidad.controller');

const router = Router();
router.use(auth, permiso('produccion.control.ver'));
router.get('/lotes', validar.listar, controller.listar);
router.get(
  '/materias-primas/:productoId/lotes/:lote',
  validar.inversa,
  controller.obtenerInversa,
);
router.get('/lotes/:lote/pdf', validar.detalle, controller.descargarPdf);
router.get('/lotes/:lote', validar.detalle, controller.obtener);

module.exports = router;
