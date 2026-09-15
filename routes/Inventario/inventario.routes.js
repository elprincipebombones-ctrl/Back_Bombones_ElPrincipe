const { Router } = require('express');
const { query, param } = require('express-validator');
const {
  MovimientoInventario,
  DetalleMovimiento,
  Producto,
  Bodega,
  UnidadMedida,
  CategoriaProducto,
} = require('../../models');
const { ok, fail } = require('../../utils/response');
const service = require('../../services/inventario/informes.service');
const validar = require('../../middleware/validar');
const router = Router();
router.use(require('../../middleware/auth'), require('../../middleware/permiso')('Inventario.Ver'));
router.use(require('./operaciones.routes'));
router.get('/catalogos', async (_req, res, next) => {
  try {
    const [productos, bodegas, categorias, unidades] = await Promise.all([
      Producto.findAll({
        attributes: ['id', 'codigo', 'nombre', 'categoriaProductoId', 'unidadMedidaId', 'estado'],
        order: [['codigo', 'ASC']],
      }),
      Bodega.findAll({
        attributes: ['id', 'codigo', 'nombre', 'estado'],
        order: [['nombre', 'ASC']],
      }),
      CategoriaProducto.findAll({
        attributes: ['id', 'codigo', 'nombre', 'clasificacionMp', 'estado'],
        order: [['nombre', 'ASC']],
      }),
      UnidadMedida.findAll({
        attributes: ['id', 'codigo', 'nombre', 'simbolo', 'estado'],
        order: [['nombre', 'ASC']],
      }),
    ]);
    return ok(res, {
      productos,
      bodegas,
      categorias,
      unidades,
      capacidades: { filtroTipoProducto: false },
    });
  } catch (err) {
    return next(err);
  }
});
const filtros = [
  query('fechaDesde').isString(),
  query('fechaHasta').isString(),
  ...['bodegaId', 'productoId', 'categoriaProductoId'].map((key) => query(key).optional().isUUID()),
  query('tipoProducto').optional().isIn(['MATERIA_PRIMA', 'PRODUCTO_TERMINADO']),
  query('codigo').optional().isString().isLength({ max: 50 }),
  query('pagina').optional().isInt({ min: 1, max: 1000000 }),
  query('limite').optional().isInt({ min: 1, max: 200 }),
  query('formato').optional().isIn(['xlsx', 'pdf']),
  validar,
];
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
for (const [ruta, detalle] of [
  ['control-estadistico', false],
  ['movimientos', true],
]) {
  router.get(
    `/informes/${ruta}`,
    filtros,
    wrap(async (req, res) => {
      const data = await service.informe(req.query, detalle, Boolean(req.query.formato));
      if (!req.query.formato) return ok(res, data);
      return require('../../services/inventario/exportar.service').exportar(
        res,
        data,
        req.query.formato,
        detalle,
      );
    }),
  );
}
router.get(
  '/movimientos/:id',
  param('id').isUUID(),
  validar,
  wrap(async (req, res) => {
    const movimiento = await MovimientoInventario.findByPk(req.params.id, {
      include: [
        { model: Bodega, as: 'bodega' },
        {
          model: DetalleMovimiento,
          as: 'detalles',
          include: [
            { model: Producto, as: 'producto' },
            { model: UnidadMedida, as: 'unidadMedida' },
          ],
        },
      ],
    });
    return movimiento ? ok(res, movimiento) : fail(res, 'Movimiento no encontrado', 404);
  }),
);
module.exports = router;
