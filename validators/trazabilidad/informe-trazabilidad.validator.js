const { param, query } = require('express-validator');
const validar = require('../../middleware/validar');

const filtrosComunes = [
  query('productoId').optional().isUUID(),
  query('ordenProduccionId').optional().isUUID(),
];

const listar = [
  query('lote').optional().isString().trim().isLength({ min: 1, max: 100 }),
  ...filtrosComunes,
  query('estadoOrden').optional().isString().trim().isLength({ min: 1, max: 40 }),
  query('fechaDesde')
    .optional()
    .isISO8601({ strict: true })
    .matches(/^\d{4}-\d{2}-\d{2}$/),
  query('fechaHasta')
    .optional()
    .isISO8601({ strict: true })
    .matches(/^\d{4}-\d{2}-\d{2}$/),
  query('pagina').optional().isInt({ min: 1, max: 1000000 }),
  query('limite').optional().isInt({ min: 1, max: 200 }),
  validar,
];

const detalle = [
  param('lote').isString().trim().isLength({ min: 1, max: 100 }),
  ...filtrosComunes,
  validar,
];

const inversa = [
  param('productoId').isUUID(),
  param('lote').isString().trim().isLength({ min: 1, max: 100 }),
  query('fechaVencimiento')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601({ strict: true })
    .matches(/^\d{4}-\d{2}-\d{2}$/),
  validar,
];

module.exports = { listar, detalle, inversa };
