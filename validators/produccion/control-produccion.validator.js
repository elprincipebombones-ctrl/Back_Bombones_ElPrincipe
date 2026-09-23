const { body, param, query } = require('express-validator');

exports.listarControlValidator = [query('buscar').optional().isString().isLength({ max: 100 })];

exports.idOrdenControlValidator = [
  param('id').isUUID().withMessage('La orden de producción no es válida'),
];

exports.mermaIdValidator = [
  ...exports.idOrdenControlValidator,
  param('mermaId').isUUID().withMessage('El registro de merma no es válido'),
];

exports.guardarResultadosValidator = [
  ...exports.idOrdenControlValidator,
  body('resultados').isArray({ min: 1 }).withMessage('Debe enviar al menos un resultado'),
  body('resultados.*.productoTerminadoId')
    .isUUID()
    .withMessage('Uno de los productos terminados no es válido'),
  body('resultados.*.cantidadProducida')
    .isFloat({ min: 0 })
    .withMessage('La cantidad producida debe ser mayor o igual a cero'),
];

exports.guardarMermaValidator = [
  ...exports.idOrdenControlValidator,
  body('tipoMerma').isIn(['MP', 'PT']).withMessage('El tipo de merma debe ser MP o PT'),
  body('productoId').isUUID().withMessage('El producto no es válido'),
  body('cantidad').isFloat({ gt: 0 }).withMessage('La cantidad debe ser mayor que cero'),
  body('motivoMermaId').isUUID().withMessage('El motivo de merma no es válido'),
  body('observacion').optional({ nullable: true }).isString().isLength({ max: 2000 }),
];
