'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `
        LOCK TABLE categorias_productos, bodegas IN SHARE ROW EXCLUSIVE MODE;
        CREATE SEQUENCE categorias_productos_codigo_seq;
        CREATE SEQUENCE bodegas_codigo_seq;
      `,
        { transaction },
      );
      for (const [tabla, prefijo, secuencia] of [
        ['categorias_productos', 'CP', 'categorias_productos_codigo_seq'],
        ['bodegas', 'BD', 'bodegas_codigo_seq'],
      ]) {
        const [[fila]] = await queryInterface.sequelize.query(
          `
          SELECT MAX(SUBSTRING(codigo FROM 4)::bigint)::text AS maximo
          FROM ${queryInterface.queryGenerator.quoteTable(tabla)} WHERE codigo ~ :patron
        `,
          { replacements: { patron: `^${prefijo}-[0-9]{1,18}$` }, transaction },
        );
        if (fila.maximo != null && BigInt(fila.maximo) > 0n) {
          await queryInterface.sequelize.query('SELECT setval(:secuencia, :maximo, true)', {
            replacements: { secuencia, maximo: fila.maximo },
            transaction,
          });
        }
      }
    });
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP SEQUENCE categorias_productos_codigo_seq;
      DROP SEQUENCE bodegas_codigo_seq;
    `);
  },
};
