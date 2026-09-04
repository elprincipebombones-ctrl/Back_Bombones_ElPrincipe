'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE recepciones
        DROP CONSTRAINT IF EXISTS recepciones_bodega_id_fkey1;

      DROP INDEX IF EXISTS movimientos_inventario_origen_idx;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS movimientos_inventario_origen_idx
        ON movimientos_inventario(origen, origen_id);
    `);
  },
};
