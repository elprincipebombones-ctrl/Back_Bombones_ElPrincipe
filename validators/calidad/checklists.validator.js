const { body, param, query } = require('express-validator');

const codigo = (opcional = false) => {
  let regla = body('codigo');
  if (opcional) regla = regla.optional();
  return regla.trim().isLength({ min: 2, max: 80 }).matches(/^[A-Z0-9_-]+$/)
    .withMessage('El código debe usar mayúsculas, números, guion o guion bajo');
};
const uuidBody = (campo, opcional = false) => {
  let regla = body(campo);
  if (opcional) regla = regla.optional();
  return regla.isUUID().withMessage(`${campo} debe ser un UUID válido`);
};
const texto = (campo, maximo, opcional = false) => {
  let regla = body(campo);
  if (opcional) regla = regla.optional();
  return regla.trim().isLength({ min: 2, max: maximo });
};
const estado = query('estado').optional().isIn(['true', 'false']);

exports.idValidator = [param('id').isUUID().withMessage('ID inválido')];
exports.listarElementosValidator = [
  query('categoria_id').optional().isUUID().withMessage('categoria_id inválido'),
  estado,
];
exports.crearCategoriaValidator = [
  codigo(),
  body('nombre').trim().isLength({ min: 2, max: 150 }),
  body('descripcion').optional({ nullable: true }).isString(),
  body('orden').optional().isInt({ min: 0 }),
  body('estado').optional().isBoolean(),
];
exports.actualizarCategoriaValidator = [
  param('id').isUUID(), codigo(true),
  body('nombre').optional().trim().isLength({ min: 2, max: 150 }),
  body('descripcion').optional({ nullable: true }).isString(),
  body('orden').optional().isInt({ min: 0 }),
  body('estado').optional().isBoolean(),
];
exports.crearElementoValidator = [
  uuidBody('categoriaElementoId'), codigo(),
  body('nombre').trim().isLength({ min: 2, max: 200 }),
  body('descripcion').optional({ nullable: true }).isString(),
  body('orden').optional().isInt({ min: 0 }),
  body('estado').optional().isBoolean(),
];
exports.actualizarElementoValidator = [
  param('id').isUUID(), uuidBody('categoriaElementoId', true), codigo(true),
  body('nombre').optional().trim().isLength({ min: 2, max: 200 }),
  body('descripcion').optional({ nullable: true }).isString(),
  body('orden').optional().isInt({ min: 0 }),
  body('estado').optional().isBoolean(),
];
const criterio = (opcional = false) => [
  codigo(opcional),
  texto('nombre', 200, opcional),
  texto('pregunta', 5000, opcional),
  uuidBody('tipoCampoId', opcional),
  body('resultadoEsperado').optional().trim().isLength({ min: 1, max: 50 }),
  body('permiteObservacion').optional().isBoolean(),
  body('requiereEvidencia').optional().isBoolean(),
  body('nivelSeveridadId').optional({ nullable: true }).isUUID().withMessage('nivelSeveridadId debe ser un UUID válido'),
  body('mensajeIncumplimiento').optional({ nullable: true }).isString(),
  body('estado').optional().isBoolean(),
  body('tipoAccionIds').optional().isArray(),
  body('tipoAccionIds.*').isUUID().withMessage('Cada acción debe ser un UUID válido'),
  body('tipoAccionIds').optional().custom((ids) => {
    if (new Set(ids).size !== ids.length) throw new Error('No se permiten acciones duplicadas');
    return true;
  }),
];
exports.crearCriterioValidator = criterio(false);
exports.actualizarCriterioValidator = [param('id').isUUID(), ...criterio(true)];
const checklist = (opcional = false) => [
  uuidBody('seccionFormatoId', opcional),
  uuidBody('criterioInspeccionId', opcional),
  texto('nombre', 200, opcional),
  body('descripcion').optional({ nullable: true }).isString(),
  body('orden').optional().isInt({ min: 0 }),
  body('estado').optional().isBoolean(),
  opcional
    ? body('elementoIds').optional().isArray({ min: 1 }).withMessage('Selecciona por lo menos un elemento')
    : body('elementoIds').isArray({ min: 1 }).withMessage('Selecciona por lo menos un elemento'),
  body('elementoIds.*').isUUID().withMessage('Cada elemento debe ser un UUID válido'),
  body('elementoIds').optional().custom((ids) => {
    if (new Set(ids).size !== ids.length) throw new Error('No se permiten elementos duplicados');
    return true;
  }),
];
exports.crearChecklistValidator = checklist(false);
exports.actualizarChecklistValidator = [param('id').isUUID(), ...checklist(true)];
exports.crearAccionCriterioValidator = [
  uuidBody('criterioInspeccionId'), uuidBody('tipoAccionId'),
  body('orden').optional().isInt({ min: 0 }), body('estado').optional().isBoolean(),
];
exports.actualizarAccionCriterioValidator = [
  param('id').isUUID(), uuidBody('criterioInspeccionId', true), uuidBody('tipoAccionId', true),
  body('orden').optional().isInt({ min: 0 }), body('estado').optional().isBoolean(),
];
