const { body, param, query } = require('express-validator');

const detalles = [
  body('observaciones').optional({ nullable: true }).isString().isLength({ max: 2000 }),
  body('detalles')
    .isArray({ min: 1 })
    .withMessage('La orden debe incluir al menos un producto terminado'),
  body('detalles.*.productoTerminadoId')
    .isUUID()
    .withMessage('Uno de los productos terminados no es válido'),
  body('detalles.*.cantidad')
    .isFloat({ gt: 0 })
    .withMessage('La cantidad de cada PT debe ser mayor que cero'),
];

exports.idOrdenValidator = [param('id').isUUID().withMessage('La orden no es válida')];
exports.guardarOrdenValidator = detalles;
exports.listarOrdenesValidator = [
  query('estado')
    .optional()
    .isIn([
      'ACTIVAS',
      'TODAS',
      'BORRADOR',
      'SIMULADA',
      'LISTA_PRODUCCION',
      'EN_PRODUCCION',
      'CANCELADA',
      'FINALIZADA',
    ]),
  query('buscar').optional().isString().isLength({ max: 50 }),
  query('productoId').optional().isUUID(),
  query('fechaDesde')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .isISO8601({ strict: true }),
  query('fechaHasta')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .isISO8601({ strict: true })
    .custom((hasta, { req }) => {
      if (req.query.fechaDesde && hasta < req.query.fechaDesde)
        throw new Error('La fecha final debe ser igual o posterior a la inicial');
      return true;
    }),
];
exports.cancelarOrdenValidator = [
  ...exports.idOrdenValidator,
  body('motivoCancelacion')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('El motivo de cancelación es obligatorio')
    .isLength({ max: 2000 })
    .withMessage('El motivo de cancelación no puede superar 2000 caracteres'),
];
exports.loteSimulacionValidator = [
  param('id').isUUID().withMessage('La orden no es válida'),
  param('loteSimulacionId').isUUID().withMessage('La asignación de lote no es válida'),
];
exports.cambiarLoteValidator = [
  ...exports.loteSimulacionValidator,
  body('bodegaId').isUUID().withMessage('La bodega no es válida'),
  body('lote').optional({ nullable: true }).isString().isLength({ max: 100 }),
  body('fechaVencimiento').optional({ nullable: true }).isISO8601(),
];
