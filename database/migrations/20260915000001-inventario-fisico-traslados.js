'use strict';
module.exports = {
  async up(q, S) {
    await q.sequelize.transaction(async (transaction) => {
      const options = { transaction };
      // Product classification is owned by the product module. Do not remove
      // tipo_producto: another migration may have created it independently.
      await q.createTable(
        'operaciones_inventario',
        {
          id: { type: S.UUID, primaryKey: true, defaultValue: S.literal('gen_random_uuid()') },
          tipo: { type: S.STRING(10), allowNull: false },
          estado: { type: S.STRING(10), allowNull: false, defaultValue: 'BORRADOR' },
          bodega_id: {
            type: S.UUID,
            allowNull: false,
            references: { model: 'bodegas', key: 'id' },
          },
          usuario_id: {
            type: S.UUID,
            allowNull: false,
            references: { model: 'usuarios', key: 'id' },
          },
          aplicado_por: { type: S.UUID, references: { model: 'usuarios', key: 'id' } },
          aplicado_en: S.DATE,
          nota: S.TEXT,
          idempotencia: { type: S.UUID, unique: true },
          solicitud_hash: S.STRING(64),
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
        options,
      );
      await q.createTable(
        'lineas_operacion_inventario',
        {
          id: { type: S.UUID, primaryKey: true, defaultValue: S.literal('gen_random_uuid()') },
          operacion_id: {
            type: S.UUID,
            allowNull: false,
            references: { model: 'operaciones_inventario', key: 'id' },
            onDelete: 'CASCADE',
          },
          producto_id: {
            type: S.UUID,
            allowNull: false,
            references: { model: 'productos', key: 'id' },
          },
          unidad_medida_id: {
            type: S.UUID,
            allowNull: false,
            references: { model: 'unidades_medida', key: 'id' },
          },
          bodega_destino_id: { type: S.UUID, references: { model: 'bodegas', key: 'id' } },
          lote: S.STRING(100),
          fecha_vencimiento: S.DATEONLY,
          cantidad_sistema: { type: S.DECIMAL(15, 3), allowNull: false },
          cantidad_contada: S.DECIMAL(15, 3),
          cantidad: { type: S.DECIMAL(15, 3), allowNull: false },
          huella: { type: S.STRING(32), allowNull: false },
        },
        options,
      );
      await q.sequelize.query(
        `ALTER TABLE operaciones_inventario ADD CHECK (tipo IN ('CONTEO','TRASLADO')),
        ADD CHECK (estado IN ('BORRADOR','APLICADO','ANULADO'));
        ALTER TABLE lineas_operacion_inventario ADD CHECK (cantidad_contada IS NULL OR cantidad_contada>=0);
        CREATE INDEX lineas_operacion_idx ON lineas_operacion_inventario(operacion_id);
        CREATE INDEX operaciones_bodega_fecha_idx ON operaciones_inventario(bodega_id,created_at);
        CREATE SEQUENCE inventario_documento_seq;`,
        options,
      );
      await q.addColumn(
        'movimientos_inventario',
        'operacion_id',
        { type: S.UUID, references: { model: 'operaciones_inventario', key: 'id' } },
        options,
      );
      await q.addIndex('movimientos_inventario', ['operacion_id'], options);
      // Every writer (including receipts) participates in the same warehouse lock.
      await q.sequelize.query(
        `CREATE FUNCTION inventario_bloquear_bodega() RETURNS trigger LANGUAGE plpgsql AS $$
        DECLARE anterior uuid; nueva uuid;
        BEGIN
          IF TG_TABLE_NAME='movimientos_inventario' THEN
            IF TG_OP<>'INSERT' THEN anterior:=OLD.bodega_id; END IF;
            IF TG_OP<>'DELETE' THEN nueva:=NEW.bodega_id; END IF;
          ELSE
            IF TG_OP<>'INSERT' THEN SELECT bodega_id INTO anterior FROM movimientos_inventario WHERE id=OLD.movimiento_inventario_id; END IF;
            IF TG_OP<>'DELETE' THEN SELECT bodega_id INTO nueva FROM movimientos_inventario WHERE id=NEW.movimiento_inventario_id; END IF;
          END IF;
          PERFORM id FROM bodegas WHERE id IN (anterior,nueva) ORDER BY id FOR UPDATE;
          IF TG_OP='DELETE' THEN RETURN OLD; END IF;
          RETURN NEW;
        END $$;
        CREATE TRIGGER inventario_lock_movimiento BEFORE INSERT OR UPDATE OR DELETE ON movimientos_inventario FOR EACH ROW EXECUTE FUNCTION inventario_bloquear_bodega();
        CREATE TRIGGER inventario_lock_detalle BEFORE INSERT OR UPDATE OR DELETE ON detalle_movimiento FOR EACH ROW EXECUTE FUNCTION inventario_bloquear_bodega();`,
        options,
      );
      for (const nombre of ['Inventario.Contar', 'Inventario.Ajustar', 'Inventario.Trasladar']) {
        await q.sequelize.query(
          `INSERT INTO permissions(id,nombre,descripcion,modulo,estado,"createdAt","updatedAt")
          SELECT gen_random_uuid(),:nombre,:nombre,'Inventario',true,NOW(),NOW() WHERE EXISTS(SELECT 1 FROM roles) ON CONFLICT(nombre) DO NOTHING;
          INSERT INTO role_permissions(rol_id,permiso_id) SELECT r.id,p.id FROM roles r CROSS JOIN permissions p
          WHERE r.nombre='Administrador' AND p.nombre=:nombre ON CONFLICT DO NOTHING`,
          { ...options, replacements: { nombre } },
        );
      }
    });
  },
  async down() {
    throw new Error('No se revierten automáticamente documentos de inventario aplicados.');
  },
};
