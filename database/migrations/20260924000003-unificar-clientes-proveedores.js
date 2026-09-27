'use strict';

const existeTabla = async (q, nombre, transaction) => {
  const [rows] = await q.sequelize.query(
    `SELECT EXISTS (SELECT 1 FROM information_schema.tables
      WHERE table_schema='public' AND table_name=:nombre) AS existe`,
    { replacements: { nombre }, transaction },
  );
  return rows[0].existe;
};

const existeColumna = async (q, tabla, columna, transaction) => {
  const [rows] = await q.sequelize.query(
    `SELECT EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=:tabla AND column_name=:columna) AS existe`,
    { replacements: { tabla, columna }, transaction },
  );
  return rows[0].existe;
};

module.exports = {
  async up(q, S) {
    await q.sequelize.transaction(async (transaction) => {
      const o = { transaction };
      if (!(await existeColumna(q, 'proveedores', 'email_facturacion_electronica', transaction)))
        await q.addColumn(
          'proveedores',
          'email_facturacion_electronica',
          { type: S.STRING(254), allowNull: true },
          o,
        );
      if (!(await existeColumna(q, 'proveedores', 'es_proveedor', transaction)))
        await q.addColumn(
          'proveedores',
          'es_proveedor',
          { type: S.BOOLEAN, allowNull: false, defaultValue: true },
          o,
        );
      if (!(await existeColumna(q, 'proveedores', 'es_cliente', transaction)))
        await q.addColumn(
          'proveedores',
          'es_cliente',
          { type: S.BOOLEAN, allowNull: false, defaultValue: false },
          o,
        );

      await q.sequelize.query(
        `UPDATE proveedores SET es_proveedor=COALESCE(es_proveedor,true), es_cliente=COALESCE(es_cliente,false)`,
        o,
      );

      if (await existeTabla(q, 'clientes', transaction)) {
        await q.sequelize.query(
          `UPDATE proveedores p SET
             es_cliente=true,
             email_facturacion_electronica=c.email_facturacion_electronica,
             razon_social=COALESCE(p.razon_social,c.razon_social),
             nombre_comercial=COALESCE(p.nombre_comercial,c.nombre_comercial),
             telefono=COALESCE(p.telefono,c.telefono),
             nombre_contacto_telefono=COALESCE(p.nombre_contacto_telefono,c.nombre_contacto_telefono),
             email=COALESCE(p.email,c.email), direccion=COALESCE(p.direccion,c.direccion),
             ciudad=COALESCE(p.ciudad,c.ciudad), updated_at=NOW()
           FROM clientes c
           WHERE UPPER(TRIM(p.tipo_documento))=UPPER(TRIM(c.tipo_documento))
             AND UPPER(REGEXP_REPLACE(p.numero_documento,'\\s','','g'))=UPPER(REGEXP_REPLACE(c.numero_documento,'\\s','','g'))`,
          o,
        );
        await q.sequelize.query(
          `INSERT INTO proveedores(id,tipo_documento,numero_documento,razon_social,nombre_comercial,
             telefono,nombre_contacto_telefono,email,email_facturacion_electronica,direccion,ciudad,
             estado,es_proveedor,es_cliente,created_at,updated_at)
           SELECT c.id,c.tipo_documento,c.numero_documento,c.razon_social,c.nombre_comercial,
             c.telefono,c.nombre_contacto_telefono,c.email,c.email_facturacion_electronica,c.direccion,
             c.ciudad,c.estado,false,true,c.created_at,c.updated_at
           FROM clientes c WHERE NOT EXISTS (SELECT 1 FROM proveedores p
             WHERE UPPER(TRIM(p.tipo_documento))=UPPER(TRIM(c.tipo_documento))
               AND UPPER(REGEXP_REPLACE(p.numero_documento,'\\s','','g'))=UPPER(REGEXP_REPLACE(c.numero_documento,'\\s','','g')))`,
          o,
        );

        if (await existeTabla(q, 'documentos_cliente', transaction)) {
          await q.sequelize.query(
            `INSERT INTO documentos_proveedor(id,proveedor_id,tipo,nombre_original,clave,mime_type,
               tamano,fecha_carga,created_at,updated_at)
             SELECT d.id,p.id,d.tipo,d.nombre_original,d.clave,d.mime_type,d.tamano,d.fecha_carga,
               d.created_at,d.updated_at
             FROM documentos_cliente d JOIN clientes c ON c.id=d.cliente_id
             JOIN proveedores p ON UPPER(TRIM(p.tipo_documento))=UPPER(TRIM(c.tipo_documento))
               AND UPPER(REGEXP_REPLACE(p.numero_documento,'\\s','','g'))=UPPER(REGEXP_REPLACE(c.numero_documento,'\\s','','g'))
             ON CONFLICT(proveedor_id,tipo) DO NOTHING`,
            o,
          );
          await q.dropTable('documentos_cliente', o);
        }
        await q.dropTable('clientes', o);
      }

      await q.sequelize.query(
        `ALTER TABLE proveedores DROP CONSTRAINT IF EXISTS proveedores_numero_documento_key;
         CREATE UNIQUE INDEX IF NOT EXISTS proveedores_documento_normalizado_unique
           ON proveedores(UPPER(TRIM(tipo_documento)),UPPER(REGEXP_REPLACE(numero_documento,'\\s','','g')));
         CREATE INDEX IF NOT EXISTS proveedores_razon_social_idx ON proveedores(LOWER(razon_social));
         CREATE INDEX IF NOT EXISTS proveedores_nombre_comercial_idx ON proveedores(LOWER(nombre_comercial));
         CREATE INDEX IF NOT EXISTS proveedores_email_facturacion_idx ON proveedores(LOWER(email_facturacion_electronica));`,
        o,
      );

      for (const nombre of [
        'Clientes.Ver',
        'Clientes.Crear',
        'Clientes.Editar',
        'Clientes.Eliminar',
      ]) {
        await q.sequelize.query(
          `INSERT INTO permissions(id,nombre,descripcion,modulo,estado,"createdAt","updatedAt")
           SELECT gen_random_uuid(),:nombre,:nombre,'Clientes',true,NOW(),NOW()
           WHERE EXISTS(SELECT 1 FROM roles) ON CONFLICT(nombre) DO NOTHING;
           INSERT INTO role_permissions(rol_id,permiso_id)
           SELECT r.id,p.id FROM roles r CROSS JOIN permissions p
           WHERE r.nombre='Administrador' AND p.nombre=:nombre ON CONFLICT DO NOTHING`,
          { ...o, replacements: { nombre } },
        );
      }
    });
  },

  async down() {
    throw new Error(
      'La unificación mueve datos de clientes a proveedores y no se revierte automáticamente.',
    );
  },
};
