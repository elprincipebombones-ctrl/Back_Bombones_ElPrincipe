const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const columnas = await queryInterface.describeTable('proveedores');
      if (!columnas.es_cliente) {
        await queryInterface.addColumn(
          'proveedores',
          'es_cliente',
          {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          { transaction },
        );
      }
      if (!columnas.es_proveedor) {
        await queryInterface.addColumn(
          'proveedores',
          'es_proveedor',
          {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          { transaction },
        );
      }
      if (!columnas.email_facturacion_electronica) {
        await queryInterface.addColumn(
          'proveedores',
          'email_facturacion_electronica',
          {
            type: Sequelize.STRING(150),
            allowNull: true,
          },
          { transaction },
        );
      }
      await queryInterface.sequelize.query(
        `DO $$ BEGIN
           IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proveedores_rol_requerido') THEN
             ALTER TABLE proveedores ADD CONSTRAINT proveedores_rol_requerido
               CHECK (es_cliente OR es_proveedor);
           END IF;
         END $$`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        "CREATE UNIQUE INDEX IF NOT EXISTS proveedores_documento_normalizado_uk ON proveedores (UPPER(REGEXP_REPLACE(numero_documento, '\\s', '', 'g')))",
        { transaction },
      );
      await queryInterface.addIndex('proveedores', ['es_cliente', 'estado'], {
        name: 'proveedores_cliente_estado_idx',
        transaction,
      });
      await queryInterface.addIndex('proveedores', ['es_proveedor', 'estado'], {
        name: 'proveedores_proveedor_estado_idx',
        transaction,
      });
      const permisos = ['Ver', 'Crear', 'Editar', 'Eliminar'].map((accion) => ({
        id: uuidv4(),
        nombre: `Clientes.${accion}`,
        descripcion: `${accion} Clientes`,
        modulo: 'Clientes',
        estado: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      for (const permiso of permisos) {
        await queryInterface.sequelize.query(
          `INSERT INTO permissions (id, nombre, descripcion, modulo, estado, "createdAt", "updatedAt")
           VALUES (:id, :nombre, :descripcion, :modulo, true, NOW(), NOW())
           ON CONFLICT (nombre) DO NOTHING`,
          { replacements: permiso, transaction },
        );
      }
      await queryInterface.sequelize.query(
        `INSERT INTO role_permissions (rol_id, permiso_id)
         SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
         WHERE r.nombre = 'Administrador' AND p.nombre LIKE 'Clientes.%'
         AND NOT EXISTS (SELECT 1 FROM role_permissions rp
           WHERE rp.rol_id = r.id AND rp.permiso_id = p.id)`,
        { transaction },
      );
    });
  },
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Los permisos pueden preexistir; se conservan para no borrar asignaciones previas.
      await queryInterface.removeIndex('proveedores', 'proveedores_cliente_estado_idx', {
        transaction,
      });
      await queryInterface.removeIndex('proveedores', 'proveedores_proveedor_estado_idx', {
        transaction,
      });
      await queryInterface.removeIndex('proveedores', 'proveedores_documento_normalizado_uk', {
        transaction,
      });
      await queryInterface.sequelize.query(
        'ALTER TABLE proveedores DROP CONSTRAINT proveedores_rol_requerido',
        { transaction },
      );
      // Los roles se conservan: en instalaciones anteriores pueden preexistir y contienen datos.
    });
  },
};
