'use strict';
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const now = new Date();

module.exports = {
  async up(queryInterface) {
    const [[administradorExistente]] = await queryInterface.sequelize.query(
      `SELECT id FROM roles WHERE nombre = 'Administrador' LIMIT 1`,
    );
    if (administradorExistente) return;

    // Roles
    const roles = [
      { id: uuidv4(), nombre: 'Administrador', descripcion: 'Acceso total al sistema' },
      { id: uuidv4(), nombre: 'Supervisor', descripcion: 'Supervisión de operaciones' },
      { id: uuidv4(), nombre: 'Empleado', descripcion: 'Operaciones diarias' },
      { id: uuidv4(), nombre: 'Invitado', descripcion: 'Acceso limitado de solo lectura' },
    ].map((r) => ({ ...r, estado: true, createdAt: now, updatedAt: now }));

    await queryInterface.bulkInsert('roles', roles);

    const adminRol = roles.find((r) => r.nombre === 'Administrador');

    // Permisos
    const permisosDef = [
      { modulo: 'Usuarios', acciones: ['Ver', 'Crear', 'Editar', 'Eliminar'] },
      { modulo: 'Roles', acciones: ['Ver', 'Crear', 'Editar', 'Eliminar'] },
      { modulo: 'Permisos', acciones: ['Ver', 'Crear', 'Editar', 'Eliminar'] },
      { modulo: 'Menus', acciones: ['Ver', 'Crear', 'Editar', 'Eliminar'] },
      { modulo: 'Inventario', acciones: ['Ver', 'Editar'] },
      { modulo: 'Compras', acciones: ['Ver'] },
      { modulo: 'Ventas', acciones: ['Ver'] },
      { modulo: 'Configuracion', acciones: ['Ver'] },
    ];

    const permisos = [];
    permisosDef.forEach(({ modulo, acciones }) => {
      acciones.forEach((accion) => {
        permisos.push({
          id: uuidv4(),
          nombre: `${modulo}.${accion}`,
          descripcion: `${accion} ${modulo}`,
          modulo,
          estado: true,
          createdAt: now,
          updatedAt: now,
        });
      });
    });

    await queryInterface.bulkInsert('permissions', permisos);

    // Asignar todos los permisos al Administrador
    await queryInterface.bulkInsert(
      'role_permissions',
      permisos.map((p) => ({ rol_id: adminRol.id, permiso_id: p.id })),
    );

    // Menús
    const menus = [
      { id: uuidv4(), nombre: 'Dashboard', ruta: '/dashboard', icono: 'dashboard', orden: 1 },
      { id: uuidv4(), nombre: 'Usuarios', ruta: '/usuarios', icono: 'people', orden: 2 },
      { id: uuidv4(), nombre: 'Roles', ruta: '/roles', icono: 'security', orden: 3 },
      { id: uuidv4(), nombre: 'Permisos', ruta: '/permisos', icono: 'lock', orden: 4 },
      { id: uuidv4(), nombre: 'Menús', ruta: '/menus', icono: 'menu', orden: 5 },
      { id: uuidv4(), nombre: 'Inventario', ruta: '/inventario', icono: 'inventory', orden: 6 },
      { id: uuidv4(), nombre: 'Compras', ruta: '/compras', icono: 'shopping_cart', orden: 7 },
      { id: uuidv4(), nombre: 'Ventas', ruta: '/ventas', icono: 'point_of_sale', orden: 8 },
      { id: uuidv4(), nombre: 'Configuración', ruta: '/configuracion', icono: 'settings', orden: 9 },
    ].map((m) => ({ ...m, estado: true, createdAt: now, updatedAt: now }));

    await queryInterface.bulkInsert('menus', menus);

    await queryInterface.bulkInsert(
      'role_menus',
      menus.map((m) => ({ rol_id: adminRol.id, menu_id: m.id })),
    );

    // Usuario Administrador
    const passwordHash = await bcrypt.hash('Admin123*', 10);
    await queryInterface.bulkInsert('usuarios', [
      {
        id: uuidv4(),
        nombre: 'Administrador',
        correo: 'admin@empresa.com',
        password: passwordHash,
        estado: true,
        rol_id: adminRol.id,
        createdAt: now,
        updatedAt: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('usuarios', null, {});
    await queryInterface.bulkDelete('role_menus', null, {});
    await queryInterface.bulkDelete('menus', null, {});
    await queryInterface.bulkDelete('role_permissions', null, {});
    await queryInterface.bulkDelete('permissions', null, {});
    await queryInterface.bulkDelete('roles', null, {});
  },
};
