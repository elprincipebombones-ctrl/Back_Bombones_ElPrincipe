const { body, param, query } = require('express-validator');

exports.listarControlValidator = [
  query('buscar').optional().isString().isLength({ max: 100 }),
  query('estado')
    .optional()
    .isIn(['EN_PRODUCCION', 'FINALIZADA'])
    .withMessage('El estado de consulta no es válido'),
];

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

exports.cerrarProduccionValidator = [
  ...exports.idOrdenControlValidator,
  body('bodegaId').isUUID().withMessage('La bodega de destino no es válida'),
  body('resultados')
    .isArray({ min: 1 })
    .withMessage('Debe confirmar al menos un producto terminado'),
  body('resultados.*.resultadoProduccionId')
    .isUUID()
    .withMessage('Uno de los resultados de producción no es válido'),
  body('resultados.*.fechaVencimientoFinal')
    .notEmpty()
    .withMessage('La fecha de vencimiento final es obligatoria')
    .isISO8601({ strict: true })
    .withMessage('La fecha de vencimiento final no es válida'),
];
