const { Router } = require('express');
const { body, param } = require('express-validator');
const { Cargo, Usuario } = require('../models');
const { ok, created, fail } = require('../utils/response');
const permiso = require('../middleware/permiso');
const validar = require('../middleware/validar');
const router = Router();
router.use(require('../middleware/auth'));
const id = [param('id').isUUID(), validar];
const fields = (optional) => [
  optional
    ? body('nombre').optional().isString().bail().trim().isLength({ min: 2, max: 100 })
    : body('nombre').isString().bail().trim().isLength({ min: 2, max: 100 }),
  body('descripcion').optional({ nullable: true }).isString().isLength({ max: 255 }),
  body('estado').optional().isBoolean(),
  validar,
];
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
router.get(
  '/',
  permiso('Cargos.Ver', 'Usuarios.Ver', 'Usuarios.Crear', 'Usuarios.Editar'),
  wrap(async (_req, res) => ok(res, await Cargo.findAll({ order: [['nombre', 'ASC']] }))),
);
router.get(
  '/:id',
  permiso('Cargos.Ver'),
  id,
  wrap(async (req, res) => {
    const cargo = await Cargo.findByPk(req.params.id);
    return cargo ? ok(res, cargo) : fail(res, 'Cargo no encontrado', 404);
  }),
);
router.post(
  '/',
  permiso('Cargos.Crear'),
  fields(false),
  wrap(async (req, res) => {
    const { nombre, descripcion, estado } = req.body;
    return created(res, await Cargo.create({ nombre, descripcion, estado }));
  }),
);
router.put(
  '/:id',
  permiso('Cargos.Editar'),
  id,
  fields(true),
  wrap(async (req, res) => {
    const cargo = await Cargo.findByPk(req.params.id);
    if (!cargo) return fail(res, 'Cargo no encontrado', 404);
    const { nombre, descripcion, estado } = req.body;
    return ok(res, await cargo.update({ nombre, descripcion, estado }));
  }),
);
router.delete(
  '/:id',
  permiso('Cargos.Eliminar'),
  id,
  wrap(async (req, res) => {
    const cargo = await Cargo.findByPk(req.params.id);
    if (!cargo) return fail(res, 'Cargo no encontrado', 404);
    if (await Usuario.count({ where: { cargoId: cargo.id } }))
      return fail(res, 'Cargo asignado a usuarios; puede inactivarlo', 409);
    await cargo.destroy();
    return ok(res, null, 'Cargo eliminado');
  }),
);
module.exports = router;
