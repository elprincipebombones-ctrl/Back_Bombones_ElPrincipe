// const { Rol, Permiso, Menu } = require('../models');
// const { ok, created, fail } = require('../utils/response');

// exports.listar = async (req, res, next) => {
//   try {
//     const roles = await Rol.findAll({
//       include: [
//         { model: Permiso, as: 'permisos', through: { attributes: [] } },
//         { model: Menu, as: 'menus', through: { attributes: [] } },
//       ],
//       order: [['nombre', 'ASC']],
//     });
//     return ok(res, roles);
//   } catch (err) {
//     return next(err);
//   }
// };

// exports.obtener = async (req, res, next) => {
//   try {
//     const rol = await Rol.findByPk(req.params.id, {
//       include: [
//         { model: Permiso, as: 'permisos', through: { attributes: [] } },
//         { model: Menu, as: 'menus', through: { attributes: [] } },
//       ],
//     });
//     if (!rol) return fail(res, 'Rol no encontrado', 404);
//     return ok(res, rol);
//   } catch (err) {
//     return next(err);
//   }
// };

// exports.crear = async (req, res, next) => {
//   try {
//     const { nombre, descripcion, permisos = [], menus = [] } = req.body;
//     const existente = await Rol.findOne({ where: { nombre } });
//     if (existente) return fail(res, 'El rol ya existe', 409);

//     const rol = await Rol.create({ nombre, descripcion });
//     if (permisos.length) await rol.setPermisos(permisos);
//     if (menus.length) await rol.setMenus(menus);

//     const creado = await Rol.findByPk(rol.id, {
//       include: [
//         { model: Permiso, as: 'permisos', through: { attributes: [] } },
//         { model: Menu, as: 'menus', through: { attributes: [] } },
//       ],
//     });
//     return created(res, creado);
//   } catch (err) {
//     return next(err);
//   }
// };

// exports.actualizar = async (req, res, next) => {
//   try {
//     const rol = await Rol.findByPk(req.params.id);
//     if (!rol) return fail(res, 'Rol no encontrado', 404);

//     const { nombre, descripcion, estado, permisos, menus } = req.body;
//     await rol.update({ nombre, descripcion, estado });
//     if (Array.isArray(permisos)) await rol.setPermisos(permisos);
//     if (Array.isArray(menus)) await rol.setMenus(menus);

//     const actualizado = await Rol.findByPk(rol.id, {
//       include: [
//         { model: Permiso, as: 'permisos', through: { attributes: [] } },
//         { model: Menu, as: 'menus', through: { attributes: [] } },
//       ],
//     });
//     return ok(res, actualizado, 'Rol actualizado');
//   } catch (err) {
//     return next(err);
//   }
// };

// exports.eliminar = async (req, res, next) => {
//   try {
//     const rol = await Rol.findByPk(req.params.id);
//     if (!rol) return fail(res, 'Rol no encontrado', 404);
//     await rol.destroy();
//     return ok(res, null, 'Rol eliminado');
//   } catch (err) {
//     return next(err);
//   }
// };


const { Rol, Permiso, Menu } = require('../models');
const { ok, created, fail } = require('../utils/response');

exports.listar = async (req, res, next) => {
  console.time('TEST-ROLES');
  try {
    const roles = await Rol.findAll({
      subQuery: false, // 👈 Evita subconsultas pesadas en el paginado/join
      include: [
        { model: Permiso, as: 'permisos', through: { attributes: [] } },
        { model: Menu, as: 'menus', through: { attributes: [] } },
      ],
      order: [['nombre', 'ASC']],
    });
     console.timeEnd('TEST-ROLES');
    return ok(res, roles);
  } catch (err) {
    return next(err);
  }
};

exports.obtener = async (req, res, next) => {
  try {
    const rol = await Rol.findByPk(req.params.id, {
      include: [
        { model: Permiso, as: 'permisos', through: { attributes: [] } },
        { model: Menu, as: 'menus', through: { attributes: [] } },
      ],
    });
    if (!rol) return fail(res, 'Rol no encontrado', 404);
    return ok(res, rol);
  } catch (err) {
    return next(err);
  }
};

exports.crear = async (req, res, next) => {
  try {
    const { nombre, descripcion, permisos = [], menus = [] } = req.body;
    const existente = await Rol.findOne({ where: { nombre } });
    if (existente) return fail(res, 'El rol ya existe', 409);

    const rol = await Rol.create({ nombre, descripcion });
    
    // Promesas en paralelo para no bloquear
    await Promise.all([
      permisos.length ? rol.setPermisos(permisos) : Promise.resolve(),
      menus.length ? rol.setMenus(menus) : Promise.resolve()
    ]);

    const creado = await Rol.findByPk(rol.id, {
      include: [
        { model: Permiso, as: 'permisos', through: { attributes: [] } },
        { model: Menu, as: 'menus', through: { attributes: [] } },
      ],
    });
    return created(res, creado);
  } catch (err) {
    return next(err);
  }
};

exports.actualizar = async (req, res, next) => {
  try {
    const rol = await Rol.findByPk(req.params.id);
    if (!rol) return fail(res, 'Rol no encontrado', 404);

    const { nombre, descripcion, estado, permisos, menus } = req.body;
    await rol.update({ nombre, descripcion, estado });

    // Promesas en paralelo
    const promises = [];
    if (Array.isArray(permisos)) promises.push(rol.setPermisos(permisos));
    if (Array.isArray(menus)) promises.push(rol.setMenus(menus));
    await Promise.all(promises);

    const actualizado = await Rol.findByPk(rol.id, {
      include: [
        { model: Permiso, as: 'permisos', through: { attributes: [] } },
        { model: Menu, as: 'menus', through: { attributes: [] } },
      ],
    });
    return ok(res, actualizado, 'Rol actualizado');
  } catch (err) {
    return next(err);
  }
};

exports.eliminar = async (req, res, next) => {
  try {
    const rol = await Rol.findByPk(req.params.id);
    if (!rol) return fail(res, 'Rol no encontrado', 404);
    await rol.destroy();
    return ok(res, null, 'Rol eliminado');
  } catch (err) {
    return next(err);
  }
};
