'use strict';
module.exports = {
  async up(q, S) {
    await q.sequelize.transaction(async (transaction) => {
      const o = { transaction };
      await q.addColumn(
        'proveedores',
        'email_facturacion_electronica',
        { type: S.STRING(254), allowNull: true },
        o,
      );
      await q.addColumn(
        'proveedores',
        'es_proveedor',
        { type: S.BOOLEAN, allowNull: false, defaultValue: true },
        o,
      );
      await q.addColumn(
        'proveedores',
        'es_cliente',
        { type: S.BOOLEAN, allowNull: false, defaultValue: false },
        o,
      );
      await q.sequelize.query('UPDATE proveedores SET es_proveedor=true, es_cliente=false', o);
      await q.sequelize.query(
        "ALTER TABLE proveedores DROP CONSTRAINT IF EXISTS proveedores_numero_documento_key; CREATE UNIQUE INDEX IF NOT EXISTS proveedores_documento_normalizado_unique ON proveedores(UPPER(TRIM(tipo_documento)),UPPER(REGEXP_REPLACE(numero_documento,'\\s','','g'))); CREATE INDEX IF NOT EXISTS proveedores_razon_social_idx ON proveedores(LOWER(razon_social)); CREATE INDEX IF NOT EXISTS proveedores_nombre_comercial_idx ON proveedores(LOWER(nombre_comercial)); CREATE INDEX IF NOT EXISTS proveedores_email_facturacion_idx ON proveedores(LOWER(email_facturacion_electronica));",
        o,
      );
      for (const nombre of [
        'Clientes.Ver',
        'Clientes.Crear',
        'Clientes.Editar',
        'Clientes.Eliminar',
      ])
        await q.sequelize.query(
          `INSERT INTO permissions(id,nombre,descripcion,modulo,estado,"createdAt","updatedAt") SELECT gen_random_uuid(),:nombre,:nombre,'Clientes',true,NOW(),NOW() WHERE EXISTS(SELECT 1 FROM roles) ON CONFLICT(nombre) DO NOTHING; INSERT INTO role_permissions(rol_id,permiso_id) SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.nombre='Administrador' AND p.nombre=:nombre ON CONFLICT DO NOTHING`,
          { ...o, replacements: { nombre } },
        );
    });
  },
  async down(q) {
    await q.sequelize.transaction(async (transaction) => {
      await q.sequelize.query(
        "DELETE FROM role_permissions WHERE permiso_id IN (SELECT id FROM permissions WHERE nombre LIKE 'Clientes.%'); DELETE FROM permissions WHERE nombre LIKE 'Clientes.%'; DROP INDEX IF EXISTS proveedores_documento_normalizado_unique; DROP INDEX IF EXISTS proveedores_razon_social_idx; DROP INDEX IF EXISTS proveedores_nombre_comercial_idx; DROP INDEX IF EXISTS proveedores_email_facturacion_idx",
        { transaction },
      );
      await q.removeColumn('proveedores', 'es_cliente', { transaction });
      await q.removeColumn('proveedores', 'es_proveedor', { transaction });
      await q.removeColumn('proveedores', 'email_facturacion_electronica', { transaction });
    });
  },
};
