const { DataTypes } = require('sequelize');

const referencia = (model, allowNull = false) => ({
  type: DataTypes.UUID,
  allowNull,
  references: { model, key: 'id' },
  onUpdate: 'CASCADE',
  onDelete: 'RESTRICT',
});

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'solicitudes_movimiento_ot',
        {
          id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
          orden_produccion_id: referencia('ordenes_produccion'),
          tipo: { type: DataTypes.STRING(15), allowNull: false },
          producto_id: referencia('productos'),
          lote: { type: DataTypes.STRING(100), allowNull: true },
          fecha_vencimiento: { type: DataTypes.DATEONLY, allowNull: true },
          cantidad: { type: DataTypes.DECIMAL(18, 6), allowNull: false },
          unidad_medida_id: referencia('unidades_medida'),
          bodega_origen_id: referencia('bodegas'),
          bodega_destino_id: referencia('bodegas'),
          motivo: { type: DataTypes.TEXT, allowNull: false },
          estado: { type: DataTypes.STRING(15), allowNull: false, defaultValue: 'PENDIENTE' },
          usuario_solicita_id: referencia('usuarios'),
          fecha_solicitud: { type: DataTypes.DATE, allowNull: false },
          usuario_aprueba_id: referencia('usuarios', true),
          fecha_aprobacion: { type: DataTypes.DATE, allowNull: true },
          movimiento_salida_id: { ...referencia('movimientos_inventario', true), unique: true },
          movimiento_entrada_id: { ...referencia('movimientos_inventario', true), unique: true },
          observacion_resolucion: { type: DataTypes.TEXT, allowNull: true },
          created_at: { type: DataTypes.DATE, allowNull: false },
          updated_at: { type: DataTypes.DATE, allowNull: false },
        },
        { transaction },
      );
      await queryInterface.addIndex(
        'solicitudes_movimiento_ot',
        ['estado', 'orden_produccion_id', 'tipo'],
        { transaction },
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE solicitudes_movimiento_ot
        ADD CONSTRAINT solicitudes_ot_tipo_check CHECK (tipo IN ('ADICIONAL', 'DEVOLUCION')),
        ADD CONSTRAINT solicitudes_ot_estado_check CHECK (estado IN ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'ATENDIDA')),
        ADD CONSTRAINT solicitudes_ot_cantidad_check CHECK (cantidad > 0),
        ADD CONSTRAINT solicitudes_ot_motivo_check CHECK (length(trim(motivo)) > 0),
        ADD CONSTRAINT solicitudes_ot_bodegas_check CHECK (bodega_origen_id <> bodega_destino_id),
        ADD CONSTRAINT solicitudes_ot_resolucion_check CHECK (
          (estado IN ('PENDIENTE', 'APROBADA') AND movimiento_salida_id IS NULL AND movimiento_entrada_id IS NULL)
          OR (estado = 'ATENDIDA' AND movimiento_salida_id IS NOT NULL AND movimiento_entrada_id IS NOT NULL
            AND usuario_aprueba_id IS NOT NULL AND fecha_aprobacion IS NOT NULL)
          OR (estado = 'RECHAZADA' AND movimiento_salida_id IS NULL AND movimiento_entrada_id IS NULL
            AND usuario_aprueba_id IS NOT NULL AND fecha_aprobacion IS NOT NULL
            AND observacion_resolucion IS NOT NULL AND length(trim(observacion_resolucion)) > 0)
        )`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `CREATE FUNCTION proteger_solicitud_movimiento_ot() RETURNS trigger AS $$
        BEGIN
          IF OLD.estado IN ('ATENDIDA', 'RECHAZADA') THEN
            RAISE EXCEPTION 'Una solicitud resuelta no se puede modificar ni eliminar';
          END IF;
          IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        CREATE TRIGGER solicitudes_ot_resueltas BEFORE UPDATE OR DELETE ON solicitudes_movimiento_ot
        FOR EACH ROW EXECUTE FUNCTION proteger_solicitud_movimiento_ot()`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const [rows] = await queryInterface.sequelize.query(
        'SELECT 1 FROM solicitudes_movimiento_ot LIMIT 1',
        { transaction },
      );
      if (rows.length) throw new Error('No se puede revertir: existen solicitudes de MP de OT');
      await queryInterface.dropTable('solicitudes_movimiento_ot', { transaction });
      await queryInterface.sequelize.query('DROP FUNCTION proteger_solicitud_movimiento_ot()', {
        transaction,
      });
    });
  },
};
