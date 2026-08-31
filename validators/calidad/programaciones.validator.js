const { body, param, query } = require('express-validator');

const dias = body('dias')
  .isArray({ min: 1 })
  .withMessage('Debes seleccionar al menos un día')
  .custom((valores) => {
    const normalizados = valores.map(Number);
    if (normalizados.some((dia) => !Number.isInteger(dia) || dia < 1 || dia > 7)) {
      throw new Error('Los días deben estar entre 1 (lunes) y 7 (domingo)');
    }
    if (new Set(normalizados).size !== normalizados.length) {
      throw new Error('No se permiten días repetidos');
    }
    return true;
  });

exports.idValidator = [param('id').isUUID()];
exports.formatoIdValidator = [param('formatoId').isUUID()];
exports.fechaPendientesValidator = [
  query('fecha').isISO8601({ strict: true }).withMessage('fecha debe tener formato YYYY-MM-DD'),
];
exports.crearValidator = [
  body('formatoCalidadId').isUUID(),
  body('fechaInicio').isISO8601({ strict: true }),
  body('fechaFin')
    .optional({ nullable: true })
    .isISO8601({ strict: true })
    .custom((fechaFin, { req }) => {
      if (fechaFin && fechaFin < req.body.fechaInicio) {
        throw new Error('fechaFin debe ser posterior o igual a fechaInicio');
      }
      return true;
    }),
  body('horaProgramada')
    .optional({ nullable: true })
    .matches(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/),
  body('activo').optional().isBoolean(),
  dias,
];
exports.actualizarValidator = [
  param('id').isUUID(),
  body('fechaInicio').optional().isISO8601({ strict: true }),
  body('fechaFin').optional({ nullable: true }).isISO8601({ strict: true }),
  body('horaProgramada')
    .optional({ nullable: true })
    .matches(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/),
  body('activo').optional().isBoolean(),
  body('dias').optional().isArray({ min: 1 }),
  body('dias.*').optional().isInt({ min: 1, max: 7 }),
];
