const { body, param } = require('express-validator');

const uuidOpcional = (campo, mensaje) =>
  body(campo).optional({ nullable: true }).isUUID().withMessage(mensaje);

const detalle = (prefijo = '') => [
  body(`${prefijo}productoId`).isUUID().withMessage('El producto es obligatorio'),
  body(`${prefijo}unidadMedidaId`)
    .optional({ nullable: true })
    .isUUID()
    .withMessage('La unidad de medida no es válida'),
  body(`${prefijo}cantidadSolicitada`)
    .optional({ nullable: true })
    .isFloat({ gt: 0 })
    .withMessage('La cantidad solicitada debe ser mayor que cero'),
  body(`${prefijo}cantidadRecibida`)
    .isFloat({ gt: 0 })
    .withMessage('La cantidad recibida debe ser mayor que cero'),
  body(`${prefijo}costoUnitario`)
    .isFloat({ gt: 0 })
    .withMessage('El costo unitario debe ser mayor que cero'),
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
  body('costoUnitario').optional().isFloat({ gt: 0 }),
  body('loteProveedor').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('fechaVencimiento').optional({ nullable: true }).isISO8601(),
  body('observaciones').optional({ nullable: true }).isString(),
];

const recepcionVehiculo = [
  body('vehiculoId')
    .optional({ nullable: true, checkFalsy: true })
    .isUUID()
    .withMessage('El vehículo seleccionado no es válido'),
  body('placa').optional({ nullable: true }).trim().isLength({ min: 1, max: 20 }),
  body('tipoVehiculo').optional({ nullable: true }).trim().isLength({ max: 50 }),
  body('marca').optional({ nullable: true }).trim().isLength({ max: 80 }),
  body('modelo').optional({ nullable: true }).trim().isLength({ max: 80 }),
  body('guardarEnMaestro').optional().isBoolean(),
  body('temperatura').optional({ nullable: true }).isFloat(),
  body('precinto').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('guiaTransporte').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('hora').optional({ nullable: true }).isTime(),
  body('vehiculoConductorOk').optional({ nullable: true }).isBoolean(),
  body().custom((_, { req }) => {
    if (req.body.vehiculoId) return true;
    if (!String(req.body.placa ?? '').trim()) {
      throw new Error('La placa del vehículo ocasional es obligatoria');
    }
    if (req.body.guardarEnMaestro && !String(req.body.tipoVehiculo ?? '').trim()) {
      throw new Error('El tipo de vehículo es obligatorio para guardarlo en el maestro');
    }
    return true;
  }),
];

exports.crearRecepcionVehiculoValidator = recepcionVehiculo;
exports.actualizarRecepcionVehiculoValidator = recepcionVehiculo;

const camposVerificacion = [
  'certificadoCalidad',
  'plagas',
  'rotuladoCorrecto',
  'condicionesEmbalaje',
  'aparienciaColorTextura',
  'empaqueEmbalaje',
  'olor',
];
exports.crearVerificacionRecepcionValidator = camposVerificacion
  .map((campo) => body(campo).optional({ nullable: true }).isBoolean())
  .concat([
    body('novedades').optional().isArray(),
    body('novedades.*.control').isIn(camposVerificacion),
    body('novedades.*.observacion').optional({ nullable: true }).isString(),
  ]);
exports.actualizarVerificacionRecepcionValidator = exports.crearVerificacionRecepcionValidator;

exports.crearTemperaturaRecepcionValidator = [
  body('detalleRecepcionId').isUUID().withMessage('El detalle de recepción es obligatorio'),
  body('temperatura').isFloat().withMessage('La temperatura es obligatoria'),
  body('hora').optional({ nullable: true }).isTime(),
  body('observaciones').optional({ nullable: true }).isString(),
];
exports.actualizarTemperaturaRecepcionValidator = [
  body('detalleRecepcionId').optional().isUUID(),
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
