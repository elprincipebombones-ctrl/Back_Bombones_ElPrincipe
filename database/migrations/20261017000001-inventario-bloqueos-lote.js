'use strict';
module.exports = {
  async up(q, S) {
    await q.sequelize.transaction(async (transaction) => {
      const o = { transaction };
      const fk = (model) => ({
        type: S.UUID,
        allowNull: false,
        references: { model, key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      });
      await q.createTable(
        'inventario_bloqueos_lote',
        {
          id: { type: S.UUID, primaryKey: true, defaultValue: S.literal('gen_random_uuid()') },
          producto_id: fk('productos'),
          bodega_id: fk('bodegas'),
          unidad_medida_id: fk('unidades_medida'),
          lote: S.STRING(100),
          fecha_vencimiento: S.DATEONLY,
          estado: { type: S.STRING(10), allowNull: false, defaultValue: 'CONGELADO' },
          motivo: { type: S.TEXT, allowNull: false },
          origen: S.STRING(20),
          inspeccion_calidad_id: {
            type: S.UUID,
            references: { model: 'inspecciones', key: 'id' },
            onDelete: 'RESTRICT',
          },
          accion_correctiva_id: {
            type: S.UUID,
            references: { model: 'acciones_correctivas', key: 'id' },
            onDelete: 'RESTRICT',
          },
          congelado_por_id: fk('usuarios'),
          congelado_en: {
            type: S.DATE,
            allowNull: false,
            defaultValue: S.literal('CURRENT_TIMESTAMP'),
          },
          liberado_por_id: {
            type: S.UUID,
            references: { model: 'usuarios', key: 'id' },
            onDelete: 'RESTRICT',
          },
          liberado_en: S.DATE,
          nota_liberacion: S.TEXT,
          created_at: {
            type: S.DATE,
            allowNull: false,
            defaultValue: S.literal('CURRENT_TIMESTAMP'),
          },
          updated_at: {
            type: S.DATE,
            allowNull: false,
            defaultValue: S.literal('CURRENT_TIMESTAMP'),
          },
        },
        o,
      );
      await q.sequelize.query(
        `ALTER TABLE inventario_bloqueos_lote
        ADD CONSTRAINT inventario_bloqueo_estado_chk CHECK (estado IN ('CONGELADO','LIBERADO')),
        ADD CONSTRAINT inventario_bloqueo_origen_chk CHECK (origen IS NULL OR origen IN ('INVENTARIO','CALIDAD','RECEPCION','OTRO')),
        ADD CONSTRAINT inventario_bloqueo_motivo_chk CHECK (length(btrim(motivo)) > 0),
        ADD CONSTRAINT inventario_bloqueo_liberacion_chk CHECK ((estado='CONGELADO' AND liberado_por_id IS NULL AND liberado_en IS NULL) OR (estado='LIBERADO' AND liberado_por_id IS NOT NULL AND liberado_en IS NOT NULL));
        CREATE UNIQUE INDEX inventario_bloqueo_activo_unico ON inventario_bloqueos_lote
          (producto_id,bodega_id,unidad_medida_id,COALESCE(lote,''),COALESCE(fecha_vencimiento,DATE '0001-01-01')) WHERE estado='CONGELADO';
        CREATE INDEX inventario_bloqueo_busqueda_idx ON inventario_bloqueos_lote(producto_id,bodega_id,lote,fecha_vencimiento,estado);`,
        o,
      );
      await q.createTable(
        'inventario_eventos_auditoria',
        {
          id: { type: S.UUID, primaryKey: true, defaultValue: S.literal('gen_random_uuid()') },
          evento: { type: S.STRING(60), allowNull: false },
          usuario_id: fk('usuarios'),
          bloqueo_id: fk('inventario_bloqueos_lote'),
          producto_id: fk('productos'),
          bodega_id: fk('bodegas'),
          unidad_medida_id: fk('unidades_medida'),
          lote: S.STRING(100),
          fecha_vencimiento: S.DATEONLY,
          motivo: S.TEXT,
          origen: S.STRING(20),
          ip: S.STRING(64),
          metadatos: S.JSONB,
          ocurrido_en: {
            type: S.DATE,
            allowNull: false,
            defaultValue: S.literal('CURRENT_TIMESTAMP'),
          },
        },
        o,
      );
      await q.addIndex('inventario_eventos_auditoria', ['bloqueo_id', 'ocurrido_en'], o);
      for (const nombre of [
        'Inventario.CongelarLote',
        'Inventario.LiberarLote',
        'Inventario.VerBloqueos',
        'Inventario.VerHistorialBloqueos',
      ]) {
        await q.sequelize.query(
          `INSERT INTO permissions(id,nombre,descripcion,modulo,estado,"createdAt","updatedAt") SELECT gen_random_uuid(),:nombre,:nombre,'Inventario',true,NOW(),NOW() WHERE EXISTS(SELECT 1 FROM roles) ON CONFLICT(nombre) DO NOTHING;
          INSERT INTO role_permissions(rol_id,permiso_id) SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.nombre='Administrador' AND p.nombre=:nombre ON CONFLICT DO NOTHING`,
          { ...o, replacements: { nombre } },
        );
      }
    });
  },
  async down(q) {
    await q.sequelize.transaction(async (transaction) => {
      await q.dropTable('inventario_eventos_auditoria', { transaction });
      await q.dropTable('inventario_bloqueos_lote', { transaction });
      await q.sequelize.query(
        `DELETE FROM role_permissions WHERE permiso_id IN (
          SELECT id FROM permissions WHERE nombre IN (
            'Inventario.CongelarLote','Inventario.LiberarLote',
            'Inventario.VerBloqueos','Inventario.VerHistorialBloqueos'
          )
        );
        DELETE FROM permissions WHERE nombre IN (
          'Inventario.CongelarLote','Inventario.LiberarLote',
          'Inventario.VerBloqueos','Inventario.VerHistorialBloqueos'
        );`,
        { transaction },
      );
    });
  },
};
