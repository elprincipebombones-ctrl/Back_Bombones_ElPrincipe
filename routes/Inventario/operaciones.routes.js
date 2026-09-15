const { Router } = require('express');
const { body, param, query } = require('express-validator');
const validar = require('../../middleware/validar');
const permiso = require('../../middleware/permiso');
const { ok, created } = require('../../utils/response');
const operaciones = require('../../services/inventario/operaciones.service');
const consultas = require('../../services/inventario/consultas.service');
const router = Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
const id = [param('id').isUUID(), validar];
const paginacion = [
  query('pagina').optional().isInt({ min: 1, max: 1000000 }),
  query('limite').optional().isInt({ min: 1, max: 200 }),
  query('bodegaId').optional().isUUID(),
];
const detalle = [
  body('detalles').isArray({ min: 1, max: 500 }),
  body('detalles.*.productoId').isUUID(),
  body('detalles.*.lote').optional({ nullable: true }).isString().isLength({ max: 100 }),
  body('detalles.*.fechaVencimiento')
    .optional({ nullable: true })
    .isISO8601({ strict: true })
    .matches(/^\d{4}-\d{2}-\d{2}$/),
  body('nota').optional({ nullable: true }).isString().trim().isLength({ max: 2000 }),
];
const conteo = [
  body('bodegaId').isUUID(),
  ...detalle,
  body('detalles.*.cantidadContada').custom((v) => {
    operaciones.miles(v);
    return true;
  }),
  validar,
];
router.get(
  '/existencias',
  paginacion,
  query('productoId').optional().isUUID(),
  query('categoriaProductoId').optional().isUUID(),
  query('codigo').optional().isString().isLength({ max: 50 }),
  query('tipoProducto').optional().isIn(['MATERIA_PRIMA', 'PRODUCTO_TERMINADO']),
  validar,
  wrap(async (req, res) => ok(res, await consultas.existencias(req.query))),
);
router.get(
  '/kardex',
  paginacion,
  query('productoId').isUUID(),
  query('fechaDesde').isString(),
  query('fechaHasta').isString(),
  query('formato').optional().isIn(['xlsx', 'pdf']),
  validar,
  wrap(async (req, res) => {
    const data = await consultas.kardex(req.query, Boolean(req.query.formato));
    return req.query.formato
      ? require('../../services/inventario/exportar.service').exportar(
          res,
          data,
          req.query.formato,
          'kardex',
        )
      : ok(res, data);
  }),
);
for (const [ruta, tipo] of [
  ['conteos', 'CONTEO'],
  ['traslados', 'TRASLADO'],
]) {
  router.get(
    `/${ruta}`,
    paginacion,
    query('estado').optional().isIn(['BORRADOR', 'APLICADO', 'ANULADO']),
    validar,
    wrap(async (req, res) => ok(res, await operaciones.listar(req.query, tipo))),
  );
  router.get(
    `/${ruta}/:id`,
    id,
    wrap(async (req, res) => {
      const data = await operaciones.obtener(req.params.id);
      if (data.tipo !== tipo)
        throw Object.assign(new Error('Operación no encontrada'), { status: 404 });
      return ok(res, data);
    }),
  );
}
router.post(
  '/conteos',
  permiso('Inventario.Contar'),
  conteo,
  wrap(async (req, res) => created(res, await operaciones.guardarConteo(req.body, req.usuario.id))),
);
router.put(
  '/conteos/:id',
  permiso('Inventario.Contar'),
  id,
  conteo,
  wrap(async (req, res) =>
    ok(res, await operaciones.guardarConteo(req.body, req.usuario.id, req.params.id)),
  ),
);
router.post(
  '/conteos/:id/aplicar',
  permiso('Inventario.Ajustar'),
  id,
  body('nota').optional().isString().trim().isLength({ min: 1, max: 2000 }),
  validar,
  wrap(async (req, res) =>
    ok(res, await operaciones.aplicarConteo(req.params.id, req.body.nota, req.usuario.id)),
  ),
);
router.post(
  '/conteos/:id/anular',
  permiso('Inventario.Contar'),
  id,
  wrap(async (req, res) => ok(res, await operaciones.anularConteo(req.params.id))),
);
router.post(
  '/traslados',
  permiso('Inventario.Trasladar'),
  body('idempotencia').isUUID(),
  body('bodegaId').isUUID(),
  ...detalle,
  body('detalles.*.bodegaDestinoId').isUUID(),
  body('detalles.*.cantidad').custom((v) => {
    if (operaciones.miles(v) <= 0n) throw new Error('Cantidad debe ser positiva');
    return true;
  }),
  validar,
  wrap(async (req, res) => created(res, await operaciones.trasladar(req.body, req.usuario.id))),
);
module.exports = router;
