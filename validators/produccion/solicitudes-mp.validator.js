const { body, param, query } = require('express-validator');

const tipos = ['ADICIONAL', 'DEVOLUCION'];
exports.orden = [param('id').isUUID()];
exports.id = [param('solicitudId').isUUID()];
exports.catalogos = [...exports.orden, query('tipo').isIn(tipos)];
exports.listar = [
  query('ordenId').optional().isUUID(),
  query('tipo').optional().isIn(tipos),
  query('estado').optional().isIn(['PENDIENTE', 'APROBADA', 'RECHAZADA', 'ATENDIDA']),
  query('ot').optional().isString().isLength({ max: 50 }),
];
exports.crear = [
  ...exports.orden,
  body('tipo').isIn(tipos),
  body('productoId').isUUID(),
  body('unidadMedidaId').isUUID(),
  body('bodegaOrigenId').isUUID(),
  body('bodegaDestinoId').isUUID(),
  body('lote').optional({ nullable: true }).isString().isLength({ min: 1, max: 100 }),
  body('fechaVencimiento')
    .optional({ nullable: true })
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .isISO8601({ strict: true }),
  body('cantidad').isFloat({ gt: 0 }),
  body('motivo').isString().trim().notEmpty().isLength({ max: 2000 }),
];
exports.resolver = [
  ...exports.id,
  body('accion').isIn(['EJECUTAR', 'RECHAZAR']),
  body('observacion').optional({ nullable: true }).isString().isLength({ max: 2000 }),
];
