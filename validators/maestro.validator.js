
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