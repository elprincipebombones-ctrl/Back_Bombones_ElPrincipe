module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.sequelize.query(
        `CREATE SEQUENCE IF NOT EXISTS productos_codigo_mp_seq
         START WITH 1
         INCREMENT BY 1
         NO CYCLE`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `CREATE SEQUENCE IF NOT EXISTS productos_codigo_pt_seq
         START WITH 50001
         INCREMENT BY 1
         NO CYCLE`,
        { transaction },
      );

      // Libera los códigos actuales antes de reasignarlos para no chocar con el índice único.
      await queryInterface.sequelize.query(
        `UPDATE productos
         SET codigo = 'TMP-' || id::text`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `WITH numerados AS (
           SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS consecutivo
           FROM productos
           WHERE tipo_producto IN ('MP', 'INSUMO', 'EMPAQUE')
         )
         UPDATE productos AS p
         SET codigo = 'MP-' || LPAD(n.consecutivo::text, 5, '0')
         FROM numerados AS n
         WHERE p.id = n.id`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `WITH numerados AS (
           SELECT id, 50000 + ROW_NUMBER() OVER (ORDER BY created_at, id) AS consecutivo
           FROM productos
           WHERE tipo_producto = 'PT'
         )
         UPDATE productos AS p
         SET codigo = 'PT-' || LPAD(n.consecutivo::text, 5, '0')
         FROM numerados AS n
         WHERE p.id = n.id`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `SELECT setval(
           'productos_codigo_mp_seq',
           GREATEST(
             (SELECT COUNT(*) + 1 FROM productos WHERE tipo_producto IN ('MP', 'INSUMO', 'EMPAQUE')),
             1
           ),
           false
         )`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `SELECT setval(
           'productos_codigo_pt_seq',
           GREATEST(
             (SELECT COUNT(*) + 50001 FROM productos WHERE tipo_producto = 'PT'),
             50001
           ),
           false
         )`,
        { transaction },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP SEQUENCE IF EXISTS productos_codigo_mp_seq');
    await queryInterface.sequelize.query('DROP SEQUENCE IF EXISTS productos_codigo_pt_seq');
  },
};
