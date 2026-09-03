
const { body, param } = require('express-validator');

/**
 * =========================================
 * ID
 * =========================================
 */

exports.idValidator = [
  param('id')
    .isUUID()
    .withMessage('El ID debe ser un UUID válido')
];


/**
 * =========================================
 * PRODUCTOS
 * =========================================
 */

exports.crearProductoValidator = [
  body('codigo')
    .isString()
    .withMessage('El código es obligatorio')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('El código debe tener entre 1 y 50 caracteres'),

  body('nombre')
    .isString()
    .withMessage('El nombre es obligatorio')
    .trim()
    .isLength({ min: 2, max: 150 })
    .withMessage('El nombre debe tener entre 2 y 150 caracteres'),

  body('descripcion')
    .optional({ nullable: true })
    .isString()
    .withMessage('La descripción debe ser texto')
    .trim(),

  body('estado')
    .optional()
    .isBoolean()
    .withMessage('El estado debe ser booleano')
];


exports.actualizarProductoValidator = [
  param('id')
    .isUUID()
    .withMessage('El ID debe ser un UUID válido'),

  body('codigo')
    .optional()
    .isString()
    .withMessage('El código debe ser texto')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('El código debe tener entre 1 y 50 caracteres'),

  body('nombre')
    .optional()
    .isString()
    .withMessage('El nombre debe ser texto')
    .trim()
    .isLength({ min: 2, max: 150 })
    .withMessage('El nombre debe tener entre 2 y 150 caracteres'),

  body('descripcion')
    .optional({ nullable: true })
    .isString()
    .withMessage('La descripción debe ser texto')
    .trim(),

  body('estado')
    .optional()
    .isBoolean()
    .withMessage('El estado debe ser booleano')
];


/**
 * =========================================
 * MATERIA PRIMA
 * =========================================
 */

exports.crearMateriaPrimaValidator = [
  body('codigo')
    .isString()
    .withMessage('El código es obligatorio')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('El código debe tener entre 1 y 50 caracteres'),

  body('nombre')
    .isString()
    .withMessage('El nombre es obligatorio')
    .trim()
    .isLength({ min: 2, max: 150 })
    .withMessage('El nombre debe tener entre 2 y 150 caracteres'),

  body('descripcion')
    .optional({ nullable: true })
    .isString()
    .withMessage('La descripción debe ser texto')
    .trim(),

  body('unidadMedida')
    .optional({ nullable: true })
    .isString()
    .withMessage('La unidad de medida debe ser texto')
    .trim()
    .isLength({ max: 30 })
    .withMessage('La unidad de medida no puede superar los 30 caracteres'),

  body('estado')
    .optional()
    .isBoolean()
    .withMessage('El estado debe ser booleano')
];


exports.actualizarMateriaPrimaValidator = [
  param('id')
    .isUUID()
    .withMessage('El ID debe ser un UUID válido'),

  body('codigo')
    .optional()
    .isString()
    .withMessage('El código debe ser texto')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('El código debe tener entre 1 y 50 caracteres'),

  body('nombre')
    .optional()
    .isString()
    .withMessage('El nombre debe ser texto')
    .trim()
    .isLength({ min: 2, max: 150 })
    .withMessage('El nombre debe tener entre 2 y 150 caracteres'),

  body('descripcion')
    .optional({ nullable: true })
    .isString()
    .withMessage('La descripción debe ser texto')
    .trim(),

  body('unidadMedida')
    .optional({ nullable: true })
    .isString()
    .withMessage('La unidad de medida debe ser texto')
    .trim()
    .isLength({ max: 30 })
    .withMessage('La unidad de medida no puede superar los 30 caracteres'),

  body('estado')
    .optional()
    .isBoolean()
    .withMessage('El estado debe ser booleano')
];


/**
 * =========================================
 * PROVEEDORES
 * =========================================
 */

exports.crearProveedorValidator = [
  body('tipoDocumento')
    .isString()
    .withMessage('El tipo de documento es obligatorio')
    .trim()
    .isLength({ min: 2, max: 20 })
    .withMessage('El tipo de documento debe tener entre 2 y 20 caracteres'),

  body('numeroDocumento')
    .isString()
    .withMessage('El número de documento es obligatorio')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('El número de documento debe tener entre 3 y 30 caracteres'),

  body('razonSocial')
    .isString()
    .withMessage('La razón social es obligatoria')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('La razón social debe tener entre 2 y 200 caracteres'),

  body('nombreComercial')
    .optional({ nullable: true })
    .isString()
    .withMessage('El nombre comercial debe ser texto')
    .trim()
    .isLength({ max: 200 })
    .withMessage('El nombre comercial no puede superar los 200 caracteres'),

  body('telefono')
    .optional({ nullable: true })
    .isString()
    .withMessage('El teléfono debe ser texto')
    .trim()
    .isLength({ max: 30 })
    .withMessage('El teléfono no puede superar los 30 caracteres'),

  body('email')
    .optional({ nullable: true })
    .isEmail()
    .withMessage('El correo electrónico no es válido')
    .normalizeEmail(),

  body('direccion')
    .optional({ nullable: true })
    .isString()
    .withMessage('La dirección debe ser texto')
    .trim()
    .isLength({ max: 250 })
    .withMessage('La dirección no puede superar los 250 caracteres'),

  body('ciudad')
    .optional({ nullable: true })
    .isString()
    .withMessage('La ciudad debe ser texto')
    .trim()
    .isLength({ max: 100 })
    .withMessage('La ciudad no puede superar los 100 caracteres'),

  body('estado')
    .optional()
    .isBoolean()
    .withMessage('El estado debe ser booleano')
];


exports.actualizarProveedorValidator = [
  param('id')
    .isUUID()
    .withMessage('El ID debe ser un UUID válido'),

  body('tipoDocumento')
    .optional()
    .isString()
    .withMessage('El tipo de documento debe ser texto')
    .trim()
    .isLength({ min: 2, max: 20 })
    .withMessage('El tipo de documento debe tener entre 2 y 20 caracteres'),

  body('numeroDocumento')
    .optional()
    .isString()
    .withMessage('El número de documento debe ser texto')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('El número de documento debe tener entre 3 y 30 caracteres'),

  body('razonSocial')
    .optional()
    .isString()
    .withMessage('La razón social debe ser texto')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('La razón social debe tener entre 2 y 200 caracteres'),

  body('nombreComercial')
    .optional({ nullable: true })
    .isString()
    .withMessage('El nombre comercial debe ser texto')
    .trim()
    .isLength({ max: 200 })
    .withMessage('El nombre comercial no puede superar los 200 caracteres'),

  body('telefono')
    .optional({ nullable: true })
    .isString()
    .withMessage('El teléfono debe ser texto')
    .trim()
    .isLength({ max: 30 })
    .withMessage('El teléfono no puede superar los 30 caracteres'),

  body('email')
    .optional({ nullable: true })
    .isEmail()
    .withMessage('El correo electrónico no es válido')
    .normalizeEmail(),

  body('direccion')
    .optional({ nullable: true })
    .isString()
    .withMessage('La dirección debe ser texto')
    .trim()
    .isLength({ max: 250 })
    .withMessage('La dirección no puede superar los 250 caracteres'),

  body('ciudad')
    .optional({ nullable: true })
    .isString()
    .withMessage('La ciudad debe ser texto')
    .trim()
    .isLength({ max: 100 })
    .withMessage('La ciudad no puede superar los 100 caracteres'),

  body('estado')
    .optional()
    .isBoolean()
    .withMessage('El estado debe ser booleano')
];

exports.crearLugarAreaValidator = [

  body('codigo')
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('El código es obligatorio'),

  body('nombre')
    .isString()
    .trim()
    .isLength({ min: 2, max: 150 })
    .withMessage('El nombre es obligatorio'),

  body('tipo')
    .isString()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('El tipo es obligatorio'),

  body('descripcion')
    .optional({ nullable: true })
    .isString()
    .trim(),

  body('estado')
    .optional()
    .isBoolean()
];

exports.actualizarLugarAreaValidator = [

  param('id')
    .isUUID()
    .withMessage('El ID debe ser un UUID válido'),

  body('codigo')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 }),

  body('nombre')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 150 }),

  body('tipo')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 50 }),

  body('descripcion')
    .optional({ nullable: true })
    .isString()
    .trim(),

  body('estado')
    .optional()
    .isBoolean()
];
exports.crearVehiculoValidator = [

  body('codigo')
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('El código es obligatorio'),

  body('placa')
    .isString()
    .trim()
    .isLength({ min: 5, max: 20 })
    .withMessage('La placa es obligatoria'),

  body('tipoVehiculo')
    .isString()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('El tipo de vehículo es obligatorio'),

  body('marca')
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 80 }),

  body('modelo')
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 80 }),

  body('capacidadKg')
    .optional({ nullable: true })
    .isDecimal()
    .withMessage('La capacidad debe ser numérica'),

  body('propietario')
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 150 }),

  body('descripcion')
    .optional({ nullable: true })
    .isString()
    .trim(),

  body('estado')
    .optional()
    .isBoolean()
];

exports.actualizarVehiculoValidator = [

  param('id')
    .isUUID()
    .withMessage('El ID debe ser un UUID válido'),

  body('codigo')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 }),

  body('placa')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 5, max: 20 }),

  body('tipoVehiculo')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 50 }),

  body('marca')
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 80 }),

  body('modelo')
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 80 }),

  body('capacidadKg')
    .optional({ nullable: true })
    .isDecimal(),

  body('propietario')
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 150 }),

  body('descripcion')
    .optional({ nullable: true })
    .isString()
    .trim(),

  body('estado')
    .optional()
    .isBoolean()
];

exports.crearCategoriaProductoValidator = [
  body('nombre')
    .isString()
    .withMessage('El nombre debe ser un texto')
    .isLength({
      min: 2,
      max: 150
    })
    .withMessage('El nombre debe tener entre 2 y 150 caracteres'),

  body('codigo')
    .isString()
    .withMessage('El código debe ser un texto')
    .isLength({
      min: 1,
      max: 50
    })
    .withMessage('El código debe tener entre 1 y 50 caracteres'),

  body('descripcion')
    .optional({
      nullable: true
    })
    .isString()
    .withMessage('La descripción debe ser un texto'),

  body('estado')
    .optional()
    .isBoolean()
    .withMessage('El estado debe ser booleano')
];

exports.actualizarCategoriaProductoValidator = [
  param('id')
    .isUUID()
    .withMessage('ID inválido'),

  body('nombre')
    .optional()
    .isString()
    .withMessage('El nombre debe ser un texto')
    .isLength({
      min: 2,
      max: 150
    })
    .withMessage('El nombre debe tener entre 2 y 150 caracteres'),

  body('codigo')
    .optional()
    .isString()
    .withMessage('El código debe ser un texto')
    .isLength({
      min: 1,
      max: 50
    })
    .withMessage('El código debe tener entre 1 y 50 caracteres'),

  body('descripcion')
    .optional({
      nullable: true
    })
    .isString()
    .withMessage('La descripción debe ser un texto'),

  body('estado')
    .optional()
    .isBoolean()
    .withMessage('El estado debe ser booleano')
];

exports.idCategoriaProductoValidator = [
  param('id')
    .isUUID()
    .withMessage('ID inválido')
];


/*
|--------------------------------------------------------------------------
| ID RECEPCIÓN
|--------------------------------------------------------------------------
*/

exports.idRecepcionValidator = [
  param('id')
    .isUUID()
    .withMessage('El ID de la recepción no es válido')
];


/*
|--------------------------------------------------------------------------
| CREAR RECEPCIÓN
|--------------------------------------------------------------------------
*/

exports.crearRecepcionValidator = [

  /*
  |--------------------------------------------------------------------------
  | INFORMACIÓN GENERAL
  |--------------------------------------------------------------------------
  */

  body('numeroRecepcion')
    .trim()
    .notEmpty()
    .withMessage('El número de recepción es obligatorio')
    .isLength({ max: 50 })
    .withMessage(
      'El número de recepción no puede superar los 50 caracteres'
    ),

  body('tipoRecepcion')
    .trim()
    .notEmpty()
    .withMessage('El tipo de recepción es obligatorio')
    .isLength({ max: 50 })
    .withMessage(
      'El tipo de recepción no puede superar los 50 caracteres'
    ),

  body('fechaRecepcion')
    .notEmpty()
    .withMessage('La fecha de recepción es obligatoria')
    .isISO8601()
    .withMessage('La fecha de recepción no tiene un formato válido'),

  body('horaRecepcion')
    .optional({ nullable: true })
    .matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/)
    .withMessage(
      'La hora de recepción no tiene un formato válido'
    ),

  body('proveedorId')
    .notEmpty()
    .withMessage('El proveedor es obligatorio')
    .isUUID()
    .withMessage('El proveedor no es válido'),

  body('lugarAreaId')
    .optional({ nullable: true })
    .isUUID()
    .withMessage('El lugar o área no es válido'),

  body('lote')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage(
      'El lote no puede superar los 100 caracteres'
    ),

  body('observaciones')
    .optional({ nullable: true })
    .trim(),

  body('estado')
    .optional()
    .isBoolean()
    .withMessage('El estado debe ser verdadero o falso'),


  /*
  |--------------------------------------------------------------------------
  | USUARIOS
  |--------------------------------------------------------------------------
  */

  body('usuarioRecepcionId')
    .optional({ nullable: true })
    .isUUID()
    .withMessage(
      'El usuario de recepción no es válido'
    ),

  body('usuarioVerificacionId')
    .optional({ nullable: true })
    .isUUID()
    .withMessage(
      'El usuario de verificación no es válido'
    ),


  /*
  |--------------------------------------------------------------------------
  | DETALLES
  |--------------------------------------------------------------------------
  */

  body('detalles')
    .optional()
    .isArray()
    .withMessage(
      'Los detalles de la recepción deben ser un arreglo'
    ),

  body('detalles.*.productoId')
    .optional({ nullable: true })
    .isUUID()
    .withMessage(
      'El producto del detalle no es válido'
    ),

  body('detalles.*.materiaPrimaId')
    .optional({ nullable: true })
    .isUUID()
    .withMessage(
      'La materia prima del detalle no es válida'
    ),

  body('detalles.*.unidadMedida')
    .notEmpty()
    .withMessage(
      'La unidad de medida del detalle es obligatoria'
    )
    .isLength({ max: 30 })
    .withMessage(
      'La unidad de medida no puede superar los 30 caracteres'
    ),

  body('detalles.*.cantidadSolicitada')
    .optional({ nullable: true })
    .isDecimal()
    .withMessage(
      'La cantidad solicitada debe ser numérica'
    ),

  body('detalles.*.cantidadRecibida')
    .notEmpty()
    .withMessage(
      'La cantidad recibida es obligatoria'
    )
    .isDecimal()
    .withMessage(
      'La cantidad recibida debe ser numérica'
    ),

  body('detalles.*.fechaVencimiento')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage(
      'La fecha de vencimiento no tiene un formato válido'
    ),

  body('detalles.*.lote')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage(
      'El lote del detalle no puede superar los 100 caracteres'
    ),

  body('detalles.*.loteProveedor')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage(
      'El lote del proveedor no puede superar los 100 caracteres'
    )
];


/*
|--------------------------------------------------------------------------
| ACTUALIZAR RECEPCIÓN
|--------------------------------------------------------------------------
*/

exports.actualizarRecepcionValidator = [

  /*
  |--------------------------------------------------------------------------
  | INFORMACIÓN GENERAL
  |--------------------------------------------------------------------------
  */

  body('numeroRecepcion')
    .optional()
    .trim()
    .notEmpty()
    .withMessage(
      'El número de recepción no puede estar vacío'
    )
    .isLength({ max: 50 })
    .withMessage(
      'El número de recepción no puede superar los 50 caracteres'
    ),

  body('tipoRecepcion')
    .optional()
    .trim()
    .notEmpty()
    .withMessage(
      'El tipo de recepción no puede estar vacío'
    )
    .isLength({ max: 50 })
    .withMessage(
      'El tipo de recepción no puede superar los 50 caracteres'
    ),

  body('fechaRecepcion')
    .optional()
    .isISO8601()
    .withMessage(
      'La fecha de recepción no tiene un formato válido'
    ),

  body('horaRecepcion')
    .optional({ nullable: true })
    .matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/)
    .withMessage(
      'La hora de recepción no tiene un formato válido'
    ),

  body('proveedorId')
    .optional()
    .isUUID()
    .withMessage(
      'El proveedor no es válido'
    ),

  body('lugarAreaId')
    .optional({ nullable: true })
    .isUUID()
    .withMessage(
      'El lugar o área no es válido'
    ),

  body('lote')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage(
      'El lote no puede superar los 100 caracteres'
    ),

  body('observaciones')
    .optional({ nullable: true })
    .trim(),

  body('estado')
    .optional()
    .isBoolean()
    .withMessage(
      'El estado debe ser verdadero o falso'
    ),

  body('usuarioRecepcionId')
    .optional({ nullable: true })
    .isUUID()
    .withMessage(
      'El usuario de recepción no es válido'
    ),

  body('usuarioVerificacionId')
    .optional({ nullable: true })
    .isUUID()
    .withMessage(
      'El usuario de verificación no es válido'
    ),


  /*
  |--------------------------------------------------------------------------
  | DETALLES
  |--------------------------------------------------------------------------
  */

  body('detalles')
    .optional()
    .isArray()
    .withMessage(
      'Los detalles de la recepción deben ser un arreglo'
    ),

  body('detalles.*.productoId')
    .optional({ nullable: true })
    .isUUID()
    .withMessage(
      'El producto del detalle no es válido'
    ),

  body('detalles.*.materiaPrimaId')
    .optional({ nullable: true })
    .isUUID()
    .withMessage(
      'La materia prima del detalle no es válida'
    ),

  body('detalles.*.unidadMedida')
    .optional()
    .notEmpty()
    .withMessage(
      'La unidad de medida no puede estar vacía'
    )
    .isLength({ max: 30 })
    .withMessage(
      'La unidad de medida no puede superar los 30 caracteres'
    ),

  body('detalles.*.cantidadSolicitada')
    .optional({ nullable: true })
    .isDecimal()
    .withMessage(
      'La cantidad solicitada debe ser numérica'
    ),

  body('detalles.*.cantidadRecibida')
    .optional()
    .isDecimal()
    .withMessage(
      'La cantidad recibida debe ser numérica'
    ),

  body('detalles.*.fechaVencimiento')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage(
      'La fecha de vencimiento no tiene un formato válido'
    ),

  body('detalles.*.lote')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage(
      'El lote del detalle no puede superar los 100 caracteres'
    ),

  body('detalles.*.loteProveedor')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage(
      'El lote del proveedor no puede superar los 100 caracteres'
    )
];

exports.crearBodegaValidator = [
    body('codigo')
        .trim()
        .notEmpty()
        .withMessage('El código es obligatorio')
        .isLength({ max: 50 })
        .withMessage('El código no puede superar los 50 caracteres'),

    body('nombre')
        .trim()
        .notEmpty()
        .withMessage('El nombre es obligatorio')
        .isLength({ max: 150 })
        .withMessage('El nombre no puede superar los 150 caracteres'),

    body('tipo')
        .trim()
        .notEmpty()
        .withMessage('El tipo de bodega es obligatorio')
        .isLength({ max: 50 })
        .withMessage('El tipo no puede superar los 50 caracteres'),

    body('descripcion')
        .optional({ nullable: true })
        .trim(),

    body('direccion')
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 250 })
        .withMessage('La dirección no puede superar los 250 caracteres'),

    body('responsableId')
        .optional({ nullable: true })
        .isUUID()
        .withMessage('El responsableId debe ser un UUID válido'),

    body('estado')
        .optional()
        .isBoolean()
        .withMessage('El estado debe ser booleano')
];


exports.actualizarBodegaValidator = [
    body('codigo')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('El código no puede estar vacío')
        .isLength({ max: 50 })
        .withMessage('El código no puede superar los 50 caracteres'),

    body('nombre')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('El nombre no puede estar vacío')
        .isLength({ max: 150 })
        .withMessage('El nombre no puede superar los 150 caracteres'),

    body('tipo')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('El tipo no puede estar vacío')
        .isLength({ max: 50 })
        .withMessage('El tipo no puede superar los 50 caracteres'),

    body('descripcion')
        .optional({ nullable: true })
        .trim(),

    body('direccion')
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 250 })
        .withMessage('La dirección no puede superar los 250 caracteres'),

    body('responsableId')
        .optional({ nullable: true })
        .isUUID()
        .withMessage('El responsableId debe ser un UUID válido'),

    body('estado')
        .optional()
        .isBoolean()
        .withMessage('El estado debe ser booleano')
];


exports.idDetalleRecepcionValidator = [
  param('id')
    .isUUID()
    .withMessage('El id del detalle de recepción debe ser un UUID válido')
];


exports.crearDetalleRecepcionValidator = [
  body('productoId')
    .notEmpty()
    .withMessage('El producto es obligatorio')
    .isUUID()
    .withMessage('El productoId debe ser un UUID válido'),

  body('unidadMedidaId')
    .notEmpty()
    .withMessage('La unidad de medida es obligatoria')
    .isUUID()
    .withMessage('El unidadMedidaId debe ser un UUID válido'),

  body('cantidad')
    .notEmpty()
    .withMessage('La cantidad es obligatoria')
    .isDecimal()
    .withMessage('La cantidad debe ser un número decimal'),

  body('lote')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('El lote no puede superar los 100 caracteres'),

  body('fechaVencimiento')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('La fecha de vencimiento debe tener un formato de fecha válido'),

  body('observaciones')
    .optional({ nullable: true })
    .trim()
];


exports.actualizarDetalleRecepcionValidator = [
  body('productoId')
    .optional()
    .isUUID()
    .withMessage('El productoId debe ser un UUID válido'),

  body('unidadMedidaId')
    .optional()
    .isUUID()
    .withMessage('El unidadMedidaId debe ser un UUID válido'),

  body('cantidad')
    .optional()
    .isDecimal()
    .withMessage('La cantidad debe ser un número decimal'),

  body('lote')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('El lote no puede superar los 100 caracteres'),

  body('fechaVencimiento')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('La fecha de vencimiento debe tener un formato de fecha válido'),

  body('observaciones')
    .optional({ nullable: true })
    .trim()
];

exports.idRecepcionVehiculoValidator = [
  param('id')
    .isUUID()
    .withMessage(
      'El id del vehículo de recepción debe ser un UUID válido'
    )
];


exports.crearRecepcionVehiculoValidator = [
  body('vehiculoId')
    .notEmpty()
    .withMessage('El vehículo es obligatorio')
    .isUUID()
    .withMessage('El vehiculoId debe ser un UUID válido'),

  body('temperatura')
    .optional({ nullable: true })
    .isDecimal()
    .withMessage('La temperatura debe ser un número decimal'),

  body('precinto')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage(
      'El precinto no puede superar los 100 caracteres'
    ),

  body('guiaTransporte')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage(
      'La guía de transporte no puede superar los 100 caracteres'
    ),

  body('hora')
    .optional({ nullable: true })
    .matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/)
    .withMessage(
      'La hora debe tener formato HH:mm o HH:mm:ss'
    ),

  body('vehiculoConductorOk')
    .optional({ nullable: true })
    .isBoolean()
    .withMessage(
      'vehiculoConductorOk debe ser booleano'
    )
];


exports.actualizarRecepcionVehiculoValidator = [
  body('vehiculoId')
    .optional()
    .isUUID()
    .withMessage('El vehiculoId debe ser un UUID válido'),

  body('temperatura')
    .optional({ nullable: true })
    .isDecimal()
    .withMessage('La temperatura debe ser un número decimal'),

  body('precinto')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage(
      'El precinto no puede superar los 100 caracteres'
    ),

  body('guiaTransporte')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage(
      'La guía de transporte no puede superar los 100 caracteres'
    ),

  body('hora')
    .optional({ nullable: true })
    .matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/)
    .withMessage(
      'La hora debe tener formato HH:mm o HH:mm:ss'
    ),

  body('vehiculoConductorOk')
    .optional({ nullable: true })
    .isBoolean()
    .withMessage(
      'vehiculoConductorOk debe ser booleano'
    )
];

exports.crearVerificacionRecepcionValidator = [
  body('certificadoCalidad')
    .optional({ nullable: true })
    .isBoolean()
    .withMessage('certificadoCalidad debe ser booleano'),

  body('plagas')
    .optional({ nullable: true })
    .isBoolean()
    .withMessage('plagas debe ser booleano'),

  body('rotuladoCorrecto')
    .optional({ nullable: true })
    .isBoolean()
    .withMessage('rotuladoCorrecto debe ser booleano'),

  body('condicionesEmbalaje')
    .optional({ nullable: true })
    .isBoolean()
    .withMessage('condicionesEmbalaje debe ser booleano'),

  body('aparienciaColorTextura')
    .optional({ nullable: true })
    .isBoolean()
    .withMessage('aparienciaColorTextura debe ser booleano'),

  body('empaqueEmbalaje')
    .optional({ nullable: true })
    .isBoolean()
    .withMessage('empaqueEmbalaje debe ser booleano'),

  body('olor')
    .optional({ nullable: true })
    .isBoolean()
    .withMessage('olor debe ser booleano')
];


exports.actualizarVerificacionRecepcionValidator = [
  body('certificadoCalidad')
    .optional({ nullable: true })
    .isBoolean()
    .withMessage('certificadoCalidad debe ser booleano'),

  body('plagas')
    .optional({ nullable: true })
    .isBoolean()
    .withMessage('plagas debe ser booleano'),

  body('rotuladoCorrecto')
    .optional({ nullable: true })
    .isBoolean()
    .withMessage('rotuladoCorrecto debe ser booleano'),

  body('condicionesEmbalaje')
    .optional({ nullable: true })
    .isBoolean()
    .withMessage('condicionesEmbalaje debe ser booleano'),

  body('aparienciaColorTextura')
    .optional({ nullable: true })
    .isBoolean()
    .withMessage('aparienciaColorTextura debe ser booleano'),

  body('empaqueEmbalaje')
    .optional({ nullable: true })
    .isBoolean()
    .withMessage('empaqueEmbalaje debe ser booleano'),

  body('olor')
    .optional({ nullable: true })
    .isBoolean()
    .withMessage('olor debe ser booleano')
];

exports.idTemperaturaRecepcionValidator = [
  param('id')
    .isUUID()
    .withMessage(
      'El id de la temperatura de recepción debe ser un UUID válido'
    )
];


exports.crearTemperaturaRecepcionValidator = [
  body('productoId')
    .notEmpty()
    .withMessage('El producto es obligatorio')
    .isUUID()
    .withMessage('El productoId debe ser un UUID válido'),

  body('temperatura')
    .notEmpty()
    .withMessage('La temperatura es obligatoria')
    .isDecimal()
    .withMessage('La temperatura debe ser un número decimal'),

  body('hora')
    .optional({ nullable: true })
    .matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/)
    .withMessage(
      'La hora debe tener formato HH:mm o HH:mm:ss'
    ),

  body('observaciones')
    .optional({ nullable: true })
    .trim()
];


exports.actualizarTemperaturaRecepcionValidator = [
  body('productoId')
    .optional()
    .isUUID()
    .withMessage('El productoId debe ser un UUID válido'),

  body('temperatura')
    .optional()
    .isDecimal()
    .withMessage('La temperatura debe ser un número decimal'),

  body('hora')
    .optional({ nullable: true })
    .matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/)
    .withMessage(
      'La hora debe tener formato HH:mm o HH:mm:ss'
    ),

  body('observaciones')
    .optional({ nullable: true })
    .trim()
];

exports.crearCondicionAmbientalRecepcionValidator = [
  body('temperatura')
    .optional({ nullable: true })
    .isDecimal()
    .withMessage(
      'La temperatura debe ser un número decimal'
    ),

  body('desinfeccionRealizada')
    .optional({ nullable: true })
    .isBoolean()
    .withMessage(
      'desinfeccionRealizada debe ser booleano'
    ),

  body('productoDesinfeccion')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 150 })
    .withMessage(
      'El producto de desinfección no puede superar los 150 caracteres'
    ),

  body('concentracionDesinfeccion')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage(
      'La concentración de desinfección no puede superar los 50 caracteres'
    ),

  body('observaciones')
    .optional({ nullable: true })
    .trim()
];


exports.actualizarCondicionAmbientalRecepcionValidator = [
  body('temperatura')
    .optional({ nullable: true })
    .isDecimal()
    .withMessage(
      'La temperatura debe ser un número decimal'
    ),

  body('desinfeccionRealizada')
    .optional({ nullable: true })
    .isBoolean()
    .withMessage(
      'desinfeccionRealizada debe ser booleano'
    ),

  body('productoDesinfeccion')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 150 })
    .withMessage(
      'El producto de desinfección no puede superar los 150 caracteres'
    ),

  body('concentracionDesinfeccion')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage(
      'La concentración de desinfección no puede superar los 50 caracteres'
    ),

  body('observaciones')
    .optional({ nullable: true })
    .trim()
];

exports.crearResultadoRecepcionValidator = [
  body('resultado')
    .trim()
    .notEmpty()
    .withMessage('El resultado es obligatorio')
    .isLength({ max: 30 })
    .withMessage(
      'El resultado no puede superar los 30 caracteres'
    ),

  body('observaciones')
    .optional({ nullable: true })
    .trim(),

  body('fechaDecision')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage(
      'La fecha de decisión debe ser una fecha válida'
    )
];


exports.actualizarResultadoRecepcionValidator = [
  body('resultado')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El resultado no puede estar vacío')
    .isLength({ max: 30 })
    .withMessage(
      'El resultado no puede superar los 30 caracteres'
    ),

  body('observaciones')
    .optional({ nullable: true })
    .trim(),

  body('fechaDecision')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage(
      'La fecha de decisión debe ser una fecha válida'
    )
];

exports.idUnidadMedidaValidator = [
  param('id')
    .isUUID()
    .withMessage('El ID de la unidad de medida no es válido')
];

exports.crearUnidadMedidaValidator = [
  body('codigo')
    .notEmpty()
    .withMessage('El código de la unidad de medida es obligatorio')
    .isString()
    .withMessage('El código debe ser un texto')
    .trim()
    .isLength({ max: 20 })
    .withMessage('El código no puede superar los 20 caracteres'),

  body('nombre')
    .notEmpty()
    .withMessage('El nombre de la unidad de medida es obligatorio')
    .isString()
    .withMessage('El nombre debe ser un texto')
    .trim()
    .isLength({ max: 100 })
    .withMessage('El nombre no puede superar los 100 caracteres'),

  body('simbolo')
    .notEmpty()
    .withMessage('El símbolo de la unidad de medida es obligatorio')
    .isString()
    .withMessage('El símbolo debe ser un texto')
    .trim()
    .isLength({ max: 20 })
    .withMessage('El símbolo no puede superar los 20 caracteres'),

  body('descripcion')
    .optional({ nullable: true })
    .isString()
    .withMessage('La descripción debe ser un texto'),

  body('estado')
    .optional()
    .isBoolean()
    .withMessage('El estado debe ser verdadero o falso')
];

exports.actualizarUnidadMedidaValidator = [
  param('id')
    .isUUID()
    .withMessage('El ID de la unidad de medida no es válido'),

  body('codigo')
    .optional()
    .isString()
    .withMessage('El código debe ser un texto')
    .trim()
    .isLength({ max: 20 })
    .withMessage('El código no puede superar los 20 caracteres'),

  body('nombre')
    .optional()
    .isString()
    .withMessage('El nombre debe ser un texto')
    .trim()
    .isLength({ max: 100 })
    .withMessage('El nombre no puede superar los 100 caracteres'),

  body('simbolo')
    .optional()
    .isString()
    .withMessage('El símbolo debe ser un texto')
    .trim()
    .isLength({ max: 20 })
    .withMessage('El símbolo no puede superar los 20 caracteres'),

  body('descripcion')
    .optional({ nullable: true })
    .isString()
    .withMessage('La descripción debe ser un texto'),

  body('estado')
    .optional()
    .isBoolean()
    .withMessage('El estado debe ser verdadero o falso')
];