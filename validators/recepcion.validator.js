const { body, param } = require('express-validator');

const uuidOpcional = (campo, mensaje) =>
  body(campo).optional({ nullable: true }).isUUID().withMessage(mensaje);

const detalle = (prefijo = '') => [
  body(`${prefijo}productoId`).isUUID().withMessage('El producto es obligatorio'),
  body(`${prefijo}unidadMedidaId`).isUUID().withMessage('La unidad de medida es obligatoria'),
  body(`${prefijo}cantidadSolicitada`)
    .optional({ nullable: true })
    .isFloat({ gt: 0 })
    .withMessage('La cantidad solicitada debe ser mayor que cero'),
  body(`${prefijo}cantidadRecibida`)
    .isFloat({ gt: 0 })
    .withMessage('La cantidad recibida debe ser mayor que cero'),
  body(`${prefijo}loteProveedor`)
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('El lote del proveedor no puede superar 100 caracteres'),
  body(`${prefijo}fechaVencimiento`)
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('La fecha de vencimiento no es válida'),
  body(`${prefijo}observaciones`).optional({ nullable: true }).isString(),
];

const verificacion = (opcional = true) => {
  const campos = [
    'certificadoCalidad',
    'plagas',
    'rotuladoCorrecto',
    'condicionesEmbalaje',
    'aparienciaColorTextura',
    'empaqueEmbalaje',
    'olor',
  ];
  return campos.map((campo) => {
    const regla = body(`verificacion.${campo}`);
    return (opcional ? regla.optional({ nullable: true }) : regla).isBoolean();
  });
};

const condicionAmbiental = (prefijo = 'condicionAmbiental.') => [
  body(`${prefijo}temperatura`).optional({ nullable: true }).isFloat(),
  body(`${prefijo}desinfeccionRealizada`).optional({ nullable: true }).isBoolean(),
  body(`${prefijo}productoDesinfeccion`).optional({ nullable: true }).trim().isLength({ max: 150 }),
  body(`${prefijo}concentracionDesinfeccion`)
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 50 }),
  body(`${prefijo}observaciones`).optional({ nullable: true }).isString(),
];

exports.idRecepcionValidator = [param('id').isUUID().withMessage('ID de recepción inválido')];
exports.recepcionIdValidator = [
  param('recepcionId').isUUID().withMessage('ID de recepción inválido'),
];
exports.idDetalleRecepcionValidator = [param('id').isUUID().withMessage('ID de detalle inválido')];
exports.idRecepcionVehiculoValidator = [
  param('id').isUUID().withMessage('ID de vehículo inválido'),
];
exports.idTemperaturaRecepcionValidator = [
  param('id').isUUID().withMessage('ID de temperatura inválido'),
];

exports.crearRecepcionValidator = [
  body('fechaRecepcion').isISO8601().withMessage('La fecha de recepción es obligatoria'),
  body('proveedorId').isUUID().withMessage('El proveedor es obligatorio'),
  body('bodegaId').isUUID().withMessage('La bodega es obligatoria'),
  uuidOpcional('lugarAreaId', 'El lugar o área no es válido'),
  body('observaciones').optional({ nullable: true }).isString(),
  body('detalles').isArray({ min: 1 }).withMessage('Debe registrar al menos un producto'),
  ...detalle('detalles.*.'),
  body('verificacion').optional({ nullable: true }).isObject(),
  ...verificacion(true),
  body('condicionAmbiental').optional({ nullable: true }).isObject(),
  ...condicionAmbiental(),
];

exports.actualizarRecepcionValidator = [
  body('fechaRecepcion').optional().isISO8601(),
  body('proveedorId').optional().isUUID(),
  body('bodegaId').optional().isUUID(),
  uuidOpcional('lugarAreaId', 'El lugar o área no es válido'),
  body('observaciones').optional({ nullable: true }).isString(),
];

exports.crearDetalleRecepcionValidator = detalle();
exports.actualizarDetalleRecepcionValidator = [
  body('productoId').optional().isUUID(),
  body('unidadMedidaId').optional().isUUID(),
  body('cantidadSolicitada').optional({ nullable: true }).isFloat({ gt: 0 }),
  body('cantidadRecibida').optional().isFloat({ gt: 0 }),
  body('loteProveedor').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('fechaVencimiento').optional({ nullable: true }).isISO8601(),
  body('observaciones').optional({ nullable: true }).isString(),
];

exports.crearRecepcionVehiculoValidator = [
  body('vehiculoId').isUUID().withMessage('El vehículo es obligatorio'),
  body('temperatura').optional({ nullable: true }).isFloat(),
  body('precinto').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('guiaTransporte').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('hora').optional({ nullable: true }).isTime(),
  body('vehiculoConductorOk').optional({ nullable: true }).isBoolean(),
];
exports.actualizarRecepcionVehiculoValidator = [
  body('vehiculoId').optional().isUUID(),
  body('temperatura').optional({ nullable: true }).isFloat(),
  body('precinto').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('guiaTransporte').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('hora').optional({ nullable: true }).isTime(),
  body('vehiculoConductorOk').optional({ nullable: true }).isBoolean(),
];

const camposVerificacion = [
  'certificadoCalidad',
  'plagas',
  'rotuladoCorrecto',
  'condicionesEmbalaje',
  'aparienciaColorTextura',
  'empaqueEmbalaje',
  'olor',
];
exports.crearVerificacionRecepcionValidator = camposVerificacion.map((campo) =>
  body(campo).optional({ nullable: true }).isBoolean(),
);
exports.actualizarVerificacionRecepcionValidator = exports.crearVerificacionRecepcionValidator;

exports.crearTemperaturaRecepcionValidator = [
  body('productoId').isUUID().withMessage('El producto es obligatorio'),
  body('condicionTermica')
    .isIn(['REFRIGERADO', 'CONGELADO'])
    .withMessage('La condición térmica no es válida'),
  body('temperatura').isFloat().withMessage('La temperatura es obligatoria'),
  body('hora').optional({ nullable: true }).isTime(),
  body('observaciones').optional({ nullable: true }).isString(),
];
exports.actualizarTemperaturaRecepcionValidator = [
  body('productoId').optional().isUUID(),
  body('condicionTermica').optional().isIn(['REFRIGERADO', 'CONGELADO']),
  body('temperatura').optional().isFloat(),
  body('hora').optional({ nullable: true }).isTime(),
  body('observaciones').optional({ nullable: true }).isString(),
];

exports.crearCondicionAmbientalRecepcionValidator = condicionAmbiental('');
exports.actualizarCondicionAmbientalRecepcionValidator = condicionAmbiental('');

exports.crearResultadoRecepcionValidator = [
  body('resultado').trim().notEmpty().isLength({ max: 30 }),
  body('observaciones').optional({ nullable: true }).isString(),
  body('fechaDecision').optional({ nullable: true }).isISO8601(),
];
exports.actualizarResultadoRecepcionValidator = [
  body('resultado').optional().trim().notEmpty().isLength({ max: 30 }),
  body('observaciones').optional({ nullable: true }).isString(),
  body('fechaDecision').optional({ nullable: true }).isISO8601(),
];
