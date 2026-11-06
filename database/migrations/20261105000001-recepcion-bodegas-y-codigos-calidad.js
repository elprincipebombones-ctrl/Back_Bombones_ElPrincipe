'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `
        ALTER TABLE detalles_recepcion ADD COLUMN bodega_id UUID REFERENCES bodegas(id) ON DELETE RESTRICT;
        UPDATE detalles_recepcion d SET bodega_id = r.bodega_id FROM recepciones r WHERE r.id = d.recepcion_id;
        ALTER TABLE detalles_recepcion ALTER COLUMN bodega_id SET NOT NULL;
        CREATE INDEX detalles_recepcion_bodega_idx ON detalles_recepcion(bodega_id);
        ALTER TABLE recepciones ALTER COLUMN bodega_id DROP NOT NULL;
        ALTER TABLE movimientos_inventario DROP CONSTRAINT IF EXISTS movimientos_inventario_origen_tipo_unique;
        ALTER TABLE movimientos_inventario DROP CONSTRAINT IF EXISTS movimientos_inventario_origen_unique;
        CREATE UNIQUE INDEX movimientos_recepcion_bodega_unique ON movimientos_inventario(origen_id, tipo_documento, bodega_id) WHERE origen = 'RECEPCION';
        CREATE UNIQUE INDEX movimientos_otro_origen_unique ON movimientos_inventario(origen, origen_id, tipo_documento) WHERE origen <> 'RECEPCION';
        CREATE SEQUENCE calidad_codigo_interno_seq;
      `,
        { transaction },
      );
      // Start above any existing CA code without changing historical identifiers.
      const [tablas] = await queryInterface.sequelize.query(
        `
        SELECT table_name FROM information_schema.columns
        WHERE table_schema = 'public' AND column_name = 'codigo'
          AND table_name IN ('tipos_inspeccion','tipos_campo','unidades_medida','niveles_severidad',
            'tipos_accion','parametros_calidad','formatos_calidad','campos_formato','categorias_elemento',
            'elementos_inspeccion','criterios_inspeccion','reglas_calidad','campos_accion_correctiva')
      `,
        { transaction },
      );
      let maximo = 0n;
      const generator = queryInterface.queryGenerator;
      for (const { table_name: tabla } of tablas) {
        const [[fila]] = await queryInterface.sequelize.query(
          `SELECT MAX(SUBSTRING(codigo FROM 4)::bigint) AS maximo
          FROM ${generator.quoteTable(tabla)} WHERE codigo ~ '^CA-[0-9]{1,18}$'`,
          { transaction },
        );
        if (fila.maximo != null && BigInt(fila.maximo) > maximo) maximo = BigInt(fila.maximo);
      }
      if (maximo > 0n)
        await queryInterface.sequelize.query(
          "SELECT setval('calidad_codigo_interno_seq', :maximo, true)",
          { replacements: { maximo: String(maximo) }, transaction },
        );
    });
  },
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // The original model cannot represent a reception with multiple warehouses.
      const [[fila]] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) AS total FROM (
        SELECT recepcion_id FROM detalles_recepcion GROUP BY recepcion_id HAVING COUNT(DISTINCT bodega_id) > 1
      ) r`,
        { transaction },
      );
      if (Number(fila.total))
        throw new Error('No se puede revertir: existen recepciones con varias bodegas');
      await queryInterface.sequelize.query(
        `
        UPDATE recepciones r SET bodega_id = d.bodega_id FROM detalles_recepcion d WHERE d.recepcion_id = r.id;
        ALTER TABLE recepciones ALTER COLUMN bodega_id SET NOT NULL;
        DROP INDEX movimientos_recepcion_bodega_unique;
        DROP INDEX movimientos_otro_origen_unique;
        ALTER TABLE movimientos_inventario ADD CONSTRAINT movimientos_inventario_origen_tipo_unique UNIQUE(origen, origen_id, tipo_documento);
        ALTER TABLE detalles_recepcion DROP COLUMN bodega_id;
        DROP SEQUENCE calidad_codigo_interno_seq;
      `,
        { transaction },
      );
    });
  },
};
