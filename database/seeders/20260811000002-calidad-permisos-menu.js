'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface) {
    const ahora = new Date();
    const nombresPermiso = [
      'calidad.ver',
      'calidad.crear',
      'calidad.editar',
      'calidad.eliminar',
      'reglas.ver',
      'reglas.crear',
      'reglas.editar',
      'reglas.eliminar',
    ];
    const [existentes] = await queryInterface.sequelize.query(
      `SELECT id, nombre FROM permissions WHERE nombre IN (${nombresPermiso.map(() => '?').join(',')})`,
      { replacements: nombresPermiso },
    );
    const mapaPermisos = new Map(existentes.map((permiso) => [permiso.nombre, permiso.id]));
    const nuevos = nombresPermiso
      .filter((nombre) => !mapaPermisos.has(nombre))
      .map((nombre) => {
        const id = uuidv4();
        mapaPermisos.set(nombre, id);
        return {
          id,
          nombre,
          descripcion: nombre.replace('.', ' '),
          modulo: nombre.startsWith('calidad.') ? 'Calidad' : 'Reglas',
          estado: true,
          createdAt: ahora,
          updatedAt: ahora,
        };
      });
    if (nuevos.length) await queryInterface.bulkInsert('permissions', nuevos);

    const [[administrador]] = await queryInterface.sequelize.query(
      `SELECT id FROM roles WHERE nombre = 'Administrador' LIMIT 1`,
    );
    if (!administrador) throw new Error('No existe el rol Administrador');
    const [asignados] = await queryInterface.sequelize.query(
      'SELECT permiso_id FROM role_permissions WHERE rol_id = ?',
      { replacements: [administrador.id] },
    );
    const asignadosIds = new Set(asignados.map((item) => item.permiso_id));
    const relacionesPermiso = [...mapaPermisos.values()]
      .filter((id) => !asignadosIds.has(id))
      .map((id) => ({ rol_id: administrador.id, permiso_id: id }));
    if (relacionesPermiso.length)
      await queryInterface.bulkInsert('role_permissions', relacionesPermiso);

    const menusDef = [
      { nombre: 'Calidad', ruta: '/calidad', icono: 'verified', orden: 20 },
      { nombre: 'Maestros de calidad', ruta: '/calidad/maestros', icono: 'tune', orden: 21 },
      { nombre: 'Formatos', ruta: '/calidad/formatos', icono: 'description', orden: 22 },
      { nombre: 'Reglas', ruta: '/calidad/reglas', icono: 'rule', orden: 23 },
    ];
    const [menusExistentes] = await queryInterface.sequelize.query(
      `SELECT id, ruta FROM menus WHERE ruta IN (${menusDef.map(() => '?').join(',')})`,
      { replacements: menusDef.map((menu) => menu.ruta) },
    );
    const mapaMenus = new Map(menusExistentes.map((menu) => [menu.ruta, menu.id]));
    const menusNuevos = menusDef
      .filter((menu) => !mapaMenus.has(menu.ruta))
      .map((menu) => {
        const id = uuidv4();
        mapaMenus.set(menu.ruta, id);
        return { id, ...menu, estado: true, createdAt: ahora, updatedAt: ahora };
      });
    if (menusNuevos.length) await queryInterface.bulkInsert('menus', menusNuevos);
    const [menusAsignados] = await queryInterface.sequelize.query(
      'SELECT menu_id FROM role_menus WHERE rol_id = ?',
      { replacements: [administrador.id] },
    );
    const menusAsignadosIds = new Set(menusAsignados.map((item) => item.menu_id));
    const relacionesMenu = [...mapaMenus.values()]
      .filter((id) => !menusAsignadosIds.has(id))
      .map((id) => ({ rol_id: administrador.id, menu_id: id }));
    if (relacionesMenu.length) await queryInterface.bulkInsert('role_menus', relacionesMenu);
  },

  async down(queryInterface) {
    const nombresPermiso = [
      'calidad.ver',
      'calidad.crear',
      'calidad.editar',
      'calidad.eliminar',
      'reglas.ver',
      'reglas.crear',
      'reglas.editar',
      'reglas.eliminar',
    ];
    const [permisos] = await queryInterface.sequelize.query(
      `SELECT id FROM permissions WHERE nombre IN (${nombresPermiso.map(() => '?').join(',')})`,
      { replacements: nombresPermiso },
    );
    const rutas = ['/calidad', '/calidad/maestros', '/calidad/formatos', '/calidad/reglas'];
    const [menus] = await queryInterface.sequelize.query(
      `SELECT id FROM menus WHERE ruta IN (${rutas.map(() => '?').join(',')})`,
      { replacements: rutas },
    );
    if (permisos.length) {
      await queryInterface.bulkDelete('role_permissions', {
        permiso_id: permisos.map((p) => p.id),
      });
    }
    if (menus.length)
      await queryInterface.bulkDelete('role_menus', { menu_id: menus.map((m) => m.id) });
    await queryInterface.bulkDelete('menus', { ruta: rutas });
    await queryInterface.bulkDelete('permissions', { nombre: nombresPermiso });
  },
};
