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
  query('estado').optional().isIn(['BORRADOR', 'SIMULADA', 'EN_PRODUCCION']),
  query('buscar').optional().isString().isLength({ max: 50 }),
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
