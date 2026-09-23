const { body, param } = require('express-validator');

exports.productoTerminadoIdValidator = [
  param('productoTerminadoId').isUUID().withMessage('El producto terminado no es válido'),
];

exports.guardarFormulaValidator = [
  param('productoTerminadoId').isUUID().withMessage('El producto terminado no es válido'),
  body('componentes')
    .isArray({ min: 1 })
    .withMessage('La fórmula debe tener al menos un componente'),
  body('componentes.*.productoId').optional({ nullable: true }).isUUID(),
  body('componentes.*.familiaMpCarnicaId').optional({ nullable: true }).isUUID(),
  body('componentes.*.cantidad')
    .isFloat({ gt: 0 })
    .withMessage('La cantidad de cada componente debe ser mayor que cero'),
  body('componentes.*.unidadMedidaId')
    .isUUID()
    .withMessage('La unidad de medida del componente no es válida'),
  body('componentes.*').custom((componente) => {
    const referencias =
      Number(Boolean(componente.productoId)) + Number(Boolean(componente.familiaMpCarnicaId));
    if (referencias !== 1) {
      throw new Error('Cada componente debe usar un producto o una familia cárnica, nunca ambos');
    }
    return true;
  }),
];
