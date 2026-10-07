const { DataTypes } = require('sequelize');

const referencia = (model, allowNull = false) => ({
  type: DataTypes.UUID,
  allowNull,
  references: { model, key: 'id' },
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sql = (query) => queryInterface.sequelize.query(query, { transaction });
      await sql(`INSERT INTO bodegas
        (id, codigo, nombre, tipo, estado, created_at, updated_at)
        VALUES (gen_random_uuid(), 'PEP', 'PRODUCTO EN PROCESO', 'PRODUCCION', true, NOW(), NOW())
        ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, estado = true, updated_at = NOW()`);
      await sql(`ALTER TABLE ordenes_produccion
        DROP CONSTRAINT IF EXISTS ordenes_produccion_estado_check`);
      await sql(`ALTER TABLE ordenes_produccion ADD CONSTRAINT ordenes_produccion_estado_check
        CHECK (estado IN ('BORRADOR', 'SIMULADA', 'LISTA_PRODUCCION', 'EN_PRODUCCION', 'FINALIZADA', 'CANCELADA'))`);
      await queryInterface.addColumn(
        'ordenes_produccion',
        'movimiento_pep_id',
        referencia('movimientos_inventario', true),
        { transaction },
      );
      await queryInterface.addColumn(
        'ordenes_produccion',
        'usuario_inicio_id',
        referencia('usuarios', true),
        { transaction },
      );
      await queryInterface.addColumn(
        'ordenes_produccion',
        'fecha_inicio',
        { type: DataTypes.DATE, allowNull: true },
        { transaction },
      );
      await sql('CREATE SEQUENCE IF NOT EXISTS lotes_pt_numero_seq START WITH 1');
      await queryInterface.createTable(
        'reportes_produccion',
        {
          id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
          orden_produccion_id: referencia('ordenes_produccion'),
          producto_terminado_id: referencia('productos'),
          lote: { type: DataTypes.STRING(30), allowNull: false },
          cantidad: { type: DataTypes.DECIMAL(18, 6), allowNull: false },
          unidad_medida_id: referencia('unidades_medida'),
          usuario_id: referencia('usuarios'),
          fecha: { type: DataTypes.DATE, allowNull: false },
          movimiento_salida_id: referencia('movimientos_inventario', true),
          movimiento_entrada_id: referencia('movimientos_inventario', true),
          created_at: { type: DataTypes.DATE, allowNull: false },
          updated_at: { type: DataTypes.DATE, allowNull: false },
        },
        { transaction },
      );
      await queryInterface.addIndex(
        'reportes_produccion',
        ['orden_produccion_id', 'producto_terminado_id'],
        { transaction },
      );
      await sql(
        `ALTER TABLE reportes_produccion ADD CONSTRAINT reportes_cantidad_positiva CHECK (cantidad > 0)`,
      );
      await sql(`CREATE FUNCTION proteger_reporte_produccion() RETURNS trigger AS $$
        BEGIN
          IF OLD.movimiento_salida_id IS NOT NULL OR OLD.movimiento_entrada_id IS NOT NULL THEN
            RAISE EXCEPTION 'No se puede modificar o eliminar un parcial con movimientos aplicados';
          END IF;
          IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql`);
      await sql(`CREATE TRIGGER reportes_produccion_inmutables BEFORE UPDATE OR DELETE
        ON reportes_produccion FOR EACH ROW EXECUTE FUNCTION proteger_reporte_produccion()`);
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const [rows] = await queryInterface.sequelize.query(
        `SELECT 1 FROM ordenes_produccion
        WHERE movimiento_pep_id IS NOT NULL UNION ALL SELECT 1 FROM reportes_produccion LIMIT 1`,
        { transaction },
      );
      if (rows.length) throw new Error('No se puede revertir: existen operaciones PEP o parciales');
      await queryInterface.dropTable('reportes_produccion', { transaction });
      await queryInterface.sequelize.query('DROP FUNCTION proteger_reporte_produccion()', {
        transaction,
      });
      for (const column of ['movimiento_pep_id', 'usuario_inicio_id', 'fecha_inicio']) {
        await queryInterface.removeColumn('ordenes_produccion', column, { transaction });
      }
      await queryInterface.sequelize.query(
        `ALTER TABLE ordenes_produccion
        DROP CONSTRAINT ordenes_produccion_estado_check,
        ADD CONSTRAINT ordenes_produccion_estado_check
        CHECK (estado IN ('BORRADOR', 'SIMULADA', 'EN_PRODUCCION', 'FINALIZADA', 'CANCELADA'))`,
        { transaction },
      );
      // La bodega y la secuencia compartida se preservan para no borrar trazabilidad.
    });
  },
};
