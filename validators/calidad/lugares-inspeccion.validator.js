const { body, param, query } = require('express-validator');

const nombre = (opcional = false) => {
  let regla = body('nombre');
  if (opcional) regla = regla.optional();
  return regla.trim().isLength({ min: 2, max: 100 });
};

exports.idValidator = [param('id').isUUID().withMessage('ID inválido')];
exports.listarCategoriasValidator = [query('solo_activos').optional().isBoolean()];
exports.crearCategoriaValidator = [nombre(), body('estado').optional().isBoolean()];
exports.actualizarCategoriaValidator = [
  param('id').isUUID(),
  nombre(true),
  body('estado').optional().isBoolean(),
];
exports.listarLugaresValidator = [
  query('categoria_id').optional().isUUID(),
  query('solo_activos').optional().isBoolean(),
];
exports.crearLugarValidator = [
  nombre(),
  body('categoriaLugarInspeccionId').isUUID().withMessage('La categoría es obligatoria'),
  body('estado').optional().isBoolean(),
];
exports.actualizarLugarValidator = [
  param('id').isUUID(),
  nombre(true),
  body('estado').optional().isBoolean(),
  body('categoriaLugarInspeccionId')
    .not()
    .exists()
    .withMessage('No se puede cambiar la categoría de un lugar existente'),
];
