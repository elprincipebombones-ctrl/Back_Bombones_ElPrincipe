const { body, param, query } = require('express-validator');
const validar = require('../middleware/validar');

const nullable = (chain) => chain.optional({ nullable: true, checkFalsy: true });
const claveBody = [
  body('productoId').isUUID(),
  body('bodegaId').isUUID(),
  body('unidadMedidaId').isUUID(),
  nullable(body('lote')).isString().trim().isLength({ max: 100 }),
  nullable(body('fechaVencimiento'))
    .isISO8601({ strict: true })
    .matches(/^\d{4}-\d{2}-\d{2}$/),
];
const camposServidor = [
  'congeladoPorId',
  'congeladoEn',
  'liberadoPorId',
  'liberadoEn',
  'estado',
  'createdAt',
  'updatedAt',
];
const congelar = [
  ...claveBody,
  body('motivo').isString().bail().trim().isLength({ min: 1, max: 4000 }),
  body('origen').optional({ nullable: true }).isIn(['INVENTARIO', 'CALIDAD', 'RECEPCION', 'OTRO']),
  body('inspeccionCalidadId').optional({ nullable: true }).isUUID(),
  body('accionCorrectivaId').optional({ nullable: true }).isUUID(),
  ...camposServidor.map((campo) =>
    body(campo).not().exists().withMessage(`${campo} es generado por el servidor`),
  ),
  validar,
];
const liberar = [
  param('id').isUUID(),
  body('nota').isString().bail().trim().isLength({ min: 1, max: 4000 }),
  ...camposServidor.map((campo) =>
    body(campo).not().exists().withMessage(`${campo} es generado por el servidor`),
  ),
  validar,
];
const paginacion = [
  query('pagina').optional().isInt({ min: 1, max: 1000000 }),
  query('limite').optional().isInt({ min: 1, max: 200 }),
  query('productoId').optional().isUUID(),
  query('bodegaId').optional().isUUID(),
  query('lote').optional({ checkFalsy: false }).isString().isLength({ max: 100 }),
];
const estado = [
  query('productoId').isUUID(),
  query('bodegaId').isUUID(),
  query('unidadMedidaId').isUUID(),
  nullable(query('lote')).isString().trim().isLength({ max: 100 }),
  nullable(query('fechaVencimiento'))
    .isISO8601({ strict: true })
    .matches(/^\d{4}-\d{2}-\d{2}$/),
  validar,
];
module.exports = { congelar, liberar, paginacion, estado };
