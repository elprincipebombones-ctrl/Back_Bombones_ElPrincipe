const { Router } = require('express');
const { param, query } = require('express-validator');
const permiso = require('../../middleware/permiso');
const validar = require('../../middleware/validar');
const v = require('../../validators/inventario-bloqueos.validator');
const c = require('../../controllers/Inventario/bloqueos.controller');
const router = Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
router.post('/', permiso('Inventario.CongelarLote'), v.congelar, wrap(c.congelar));
router.get(
  '/',
  permiso('Inventario.VerBloqueos'),
  ...v.paginacion,
  query('estado').optional().isIn(['CONGELADO', 'LIBERADO']),
  validar,
  wrap(c.listar),
);
router.get(
  '/historial',
  permiso('Inventario.VerHistorialBloqueos'),
  ...v.paginacion,
  query('estado').optional().isIn(['CONGELADO', 'LIBERADO']),
  query('fechaDesde').optional().isISO8601({ strict: true }),
  query('fechaHasta').optional().isISO8601({ strict: true }),
  validar,
  wrap(c.historial),
);
router.get('/estado', permiso('Inventario.VerBloqueos'), v.estado, wrap(c.estado));
router.post('/:id/liberar', permiso('Inventario.LiberarLote'), v.liberar, wrap(c.liberar));
router.get(
  '/:id',
  permiso('Inventario.VerBloqueos'),
  param('id').isUUID(),
  validar,
  wrap(c.obtener),
);
module.exports = router;
