const { Router } = require('express');
const auth = require('../../middleware/auth');
const permiso = require('../../middleware/permiso');
const controller = require('../../controllers/reportes/trazabilidad-calidad.controller');

const router = Router();
router.use('/trazabilidad', require('./trazabilidad.routes'));
router.get(
  '/trazabilidad-producto/pdf',
  auth,
  permiso('reportes.trazabilidad.ver'),
  controller.pdfProducto,
);

const calidad = Router();
calidad.use(auth, permiso('reportes.trazabilidad_calidad.ver'));
calidad.get('/catalogos', controller.catalogos);
calidad.get('/pdf', controller.pdfCalidad);
calidad.get('/', controller.consultar);
router.use('/trazabilidad-calidad', calidad);
module.exports = router;
