const { Router } = require('express');
const auth = require('../../middleware/auth');
const permiso = require('../../middleware/permiso');
const controller = require('../../controllers/reportes/trazabilidad.controller');

const router = Router();
router.use(auth, permiso('reportes.trazabilidad.ver'));
router.get('/buscar', controller.buscar);
router.get('/consulta', controller.consultar);
module.exports = router;
