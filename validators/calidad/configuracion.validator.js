const { body, param } = require('express-validator');

const codigo = (opcional = false) => {
  let regla = body('codigo');
  if (opcional) regla = regla.optional();
  return regla.trim().isLength({ min: 2, max: 30 }).matches(/^[A-Z0-9_-]+$/);
};
const id = (campo, opcional = false, nullable = false) => {
  let regla = body(campo);
  if (opcional) regla = regla.optional({ nullable });
  return regla.isUUID().withMessage(`${campo} debe ser UUID válido`);
};

exports.idValidator = [param('id').isUUID()];
exports.formatoIdValidator = [param('formatoId').isUUID()];
exports.crearFormatoValidator = [
  codigo(),
  body('nombre').trim().isLength({ min: 2, max: 100 }),
  body('descripcion').optional({ nullable: true }).isLength({ max: 255 }),
  id('tipoInspeccionId'),
  body('estado').optional().isBoolean(),
  body('versionInicial').optional().isObject(),
  body('versionInicial.numeroVersion').optional().isInt({ min: 1 }),
  body('versionInicial.fechaVigenciaDesde').optional().isISO8601(),
];
exports.actualizarFormatoValidator = [
  param('id').isUUID(),
  codigo(true),
  body('nombre').optional().trim().isLength({ min: 2, max: 100 }),
  body('descripcion').optional({ nullable: true }).isLength({ max: 255 }),
  id('tipoInspeccionId', true),
  body('estado').optional().isBoolean(),
];
exports.crearVersionValidator = [
  id('formatoCalidadId'),
  body('numeroVersion').isInt({ min: 1 }),
  body('fechaVigenciaDesde').isISO8601(),
  body('fechaVigenciaHasta')
    .optional({ nullable: true })
    .isISO8601()
    .custom((hasta, { req }) => {
      if (req.body.fechaVigenciaDesde && hasta < req.body.fechaVigenciaDesde) {
        throw new Error('fechaVigenciaHasta debe ser posterior o igual a fechaVigenciaDesde');
      }
      return true;
    }),
  body('estadoVersion').optional().isIn(['BORRADOR', 'PUBLICADO', 'OBSOLETO']),
  body('observaciones').optional({ nullable: true }).isString(),
  id('publicadoPor', true, true),
  body('fechaPublicacion').optional({ nullable: true }).isISO8601(),
];
exports.actualizarVersionValidator = [
  param('id').isUUID(),
  id('formatoCalidadId', true),
  body('numeroVersion').optional().isInt({ min: 1 }),
  body('fechaVigenciaDesde').optional().isISO8601(),
  body('fechaVigenciaHasta').optional({ nullable: true }).isISO8601(),
  body('estadoVersion').optional().isIn(['BORRADOR', 'PUBLICADO', 'OBSOLETO']),
  body('observaciones').optional({ nullable: true }).isString(),
  id('publicadoPor', true, true),
  body('fechaPublicacion').optional({ nullable: true }).isISO8601(),
];
exports.crearSeccionValidator = [
  id('versionFormatoId'),
  body('nombre').trim().isLength({ min: 2, max: 100 }),
  body('descripcion').optional({ nullable: true }).isLength({ max: 255 }),
  body('orden').optional().isInt({ min: 0 }),
  body('estado').optional().isBoolean(),
];
exports.actualizarSeccionValidator = [
  param('id').isUUID(),
  id('versionFormatoId', true),
  body('nombre').optional().trim().isLength({ min: 2, max: 100 }),
  body('descripcion').optional({ nullable: true }).isLength({ max: 255 }),
  body('orden').optional().isInt({ min: 0 }),
  body('estado').optional().isBoolean(),
];
const camposCampo = (opcional = false) => [
  id('seccionFormatoId', opcional),
  id('parametroCalidadId', opcional),
  id('tipoCampoId', true, true),
  id('unidadMedidaId', true, true),
  codigo(true),
  body('etiqueta').optional().trim().isLength({ min: 1, max: 150 }),
  body('descripcion').optional({ nullable: true }).isLength({ max: 255 }),
  body('textoAyuda').optional({ nullable: true }).isLength({ max: 255 }),
  body('esObligatorio').optional().isBoolean(),
  body('orden').optional().isInt({ min: 0 }),
  body('valorMinimo').optional({ nullable: true }).isNumeric(),
  body('valorMaximo')
    .optional({ nullable: true })
    .isNumeric()
    .custom((maximo, { req }) => {
      if (req.body.valorMinimo !== undefined && Number(req.body.valorMinimo) > Number(maximo)) {
        throw new Error('valorMinimo debe ser menor o igual que valorMaximo');
      }
      return true;
    }),
  body('precisionDecimal').optional({ nullable: true }).isInt({ min: 0, max: 10 }),
  body('permiteObservacion').optional().isBoolean(),
  body('requiereEvidencia').optional().isBoolean(),
  body('bloquearAlGuardar').optional().isBoolean(),
  body('estado').optional().isBoolean(),
];
exports.crearCampoValidator = camposCampo(false);
exports.actualizarCampoValidator = [param('id').isUUID(), ...camposCampo(true)];
exports.crearOpcionValidator = [
  id('campoFormatoId'),
  body('valor').trim().isLength({ min: 1, max: 100 }),
  body('etiqueta').trim().isLength({ min: 1, max: 150 }),
  body('orden').optional().isInt({ min: 0 }),
  body('estado').optional().isBoolean(),
];
exports.actualizarOpcionValidator = [
  param('id').isUUID(),
  id('campoFormatoId', true),
  body('valor').optional().trim().isLength({ min: 1, max: 100 }),
  body('etiqueta').optional().trim().isLength({ min: 1, max: 150 }),
  body('orden').optional().isInt({ min: 0 }),
  body('estado').optional().isBoolean(),
];
