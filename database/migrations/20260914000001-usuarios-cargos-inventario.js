'use strict';
module.exports = {
  async up(q, S) {
    await q.sequelize.transaction(async (transaction) => {
      const options = { transaction };
      await q.createTable(
        'cargos',
        {
          id: { type: S.UUID, primaryKey: true, defaultValue: S.literal('gen_random_uuid()') },
          nombre: { type: S.STRING(100), allowNull: false, unique: true },
          descripcion: S.STRING(255),
          estado: { type: S.BOOLEAN, allowNull: false, defaultValue: true },
          createdAt: { type: S.DATE, allowNull: false, defaultValue: S.NOW },
          updatedAt: { type: S.DATE, allowNull: false, defaultValue: S.NOW },
        },
        options,
      );
      await q.addColumn('usuarios', 'usuario', { type: S.STRING(100) }, options);
      // Deterministic and collision-free; do not infer identities from shared email addresses.
      await q.sequelize.query(
        `UPDATE usuarios SET usuario = 'u_' || replace(id::text, '-', '')`,
        options,
      );
      await q.changeColumn(
        'usuarios',
        'usuario',
        { type: S.STRING(100), allowNull: false },
        options,
      );
      await q.sequelize.query(
        `CREATE UNIQUE INDEX usuarios_usuario_normalizado ON usuarios (lower(usuario))`,
        options,
      );
      await q.sequelize.query(
        `ALTER TABLE usuarios ADD CONSTRAINT usuarios_usuario_formato CHECK (usuario ~ '^[a-z0-9._-]{3,100}$')`,
        options,
      );
      const [constraints] = await q.sequelize.query(
        `SELECT c.conname FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=c.conkey[1]
        WHERE c.conrelid='usuarios'::regclass AND c.contype='u' AND cardinality(c.conkey)=1 AND a.attname='correo'`,
        options,
      );
      for (const c of constraints) await q.removeConstraint('usuarios', c.conname, options);
      const indexes = await q.showIndex('usuarios', options);
      for (const i of indexes) {
        if (i.unique && i.fields.length === 1 && i.fields[0].attribute === 'correo')
          await q.removeIndex('usuarios', i.name, options);
      }
      await q.addColumn(
        'usuarios',
        'cargo_id',
        {
          type: S.UUID,
          allowNull: true,
          references: { model: 'cargos', key: 'id' },
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        },
        options,
      );
      // Existing AJ/TR quantities are positive and have no direction. Leave them unclassified.
      await q.addColumn(
        'detalle_movimiento',
        'sentido',
        { type: S.STRING(7), allowNull: true },
        options,
      );
      await q.sequelize.query(
        `ALTER TABLE detalle_movimiento ADD CONSTRAINT detalle_sentido_check CHECK (sentido IN ('ENTRADA','SALIDA'))`,
        options,
      );
      for (const nombre of [
        'Cargos.Ver',
        'Cargos.Crear',
        'Cargos.Editar',
        'Cargos.Eliminar',
        'Inventario.Ver',
      ]) {
        await q.sequelize.query(
          `INSERT INTO permissions (id,nombre,descripcion,modulo,estado,"createdAt","updatedAt")
          SELECT gen_random_uuid(),:nombre,:nombre,:modulo,true,NOW(),NOW() WHERE EXISTS (SELECT 1 FROM roles) ON CONFLICT (nombre) DO NOTHING`,
          { ...options, replacements: { nombre, modulo: nombre.split('.')[0] } },
        );
        await q.sequelize.query(
          `INSERT INTO role_permissions (rol_id,permiso_id)
          SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.nombre='Administrador' AND p.nombre=:nombre
          ON CONFLICT DO NOTHING`,
          { ...options, replacements: { nombre } },
        );
      }
      await q.sequelize.query(
        `INSERT INTO menus (id,nombre,ruta,icono,orden,estado,"createdAt","updatedAt")
        SELECT gen_random_uuid(),'Cargos','/cargos','badge',10,true,NOW(),NOW()
        WHERE EXISTS (SELECT 1 FROM roles) AND NOT EXISTS (SELECT 1 FROM menus WHERE ruta='/cargos')`,
        options,
      );
      await q.sequelize.query(
        `INSERT INTO role_menus (rol_id,menu_id) SELECT r.id,m.id FROM roles r CROSS JOIN menus m
        WHERE r.nombre='Administrador' AND m.ruta='/cargos' ON CONFLICT DO NOTHING`,
        options,
      );
    });
  },
  async down() {
    throw new Error(
      'Migración no reversible automáticamente: puede haber correos compartidos y cargos asignados. Requiere migración de recuperación sin pérdida de datos.',
    );
  },
};
