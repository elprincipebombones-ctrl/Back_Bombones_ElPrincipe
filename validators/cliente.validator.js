const { body, param } = require('express-validator');
const opcional = (campo, max) =>
  body(campo).optional({ nullable: true, checkFalsy: true }).isString().trim().isLength({ max });
const comunes = [
  body('tipoDocumento').optional().isIn(['NIT', 'CC', 'CE']),
  body('numeroDocumento').optional().isString().trim().isLength({ min: 1, max: 30 }),
  opcional('razonSocial', 200),
  opcional('nombreComercial', 200),
  opcional('telefono', 30),
  opcional('nombreContactoTelefono', 150),
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail().normalizeEmail(),
  body('emailFacturacionElectronica').optional().isEmail().isLength({ max: 254 }).normalizeEmail(),
  opcional('direccion', 250),
  opcional('ciudad', 100),
  body('estado').optional().isBoolean(),
];
exports.crear = [
  body('tipoDocumento')
    .isIn(['NIT', 'CC', 'CE'])
    .withMessage('tipoDocumento debe ser NIT, CC o CE'),
  body('numeroDocumento').isString().trim().isLength({ min: 1, max: 30 }),
  body('emailFacturacionElectronica')
    .isEmail()
    .withMessage('El correo de facturación electrónica es obligatorio y debe ser válido')
    .isLength({ max: 254 }),
  ...comunes,
];
exports.actualizar = [param('id').isUUID(), ...comunes];
exports.id = [param('id').isUUID()];
