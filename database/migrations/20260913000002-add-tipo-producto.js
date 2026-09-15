const { DataTypes } = require('sequelize');

const TIPOS_PRODUCTO = ['MP', 'INSUMO', 'EMPAQUE', 'PT'];
const CONSTRAINT = 'productos_tipo_producto_check';

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const productos = await queryInterface.describeTable('productos', { transaction });

      if (!productos.tipo_producto) {
        await queryInterface.addColumn(
          'productos',
          'tipo_producto',
          {
            type: DataTypes.STRING(20),
            allowNull: true,
          },
          { transaction },
        );
      }

      await queryInterface.sequelize.query(
        `UPDATE productos AS p
         SET tipo_producto = CASE
           WHEN UPPER(TRIM(c.codigo)) = 'PT'
             OR UPPER(TRIM(c.nombre)) LIKE 'PRODUCTO TERMINADO%'
             THEN 'PT'
           WHEN UPPER(TRIM(c.codigo)) IN ('INS', 'INSUMO', 'INSUMOS')
             OR UPPER(TRIM(c.nombre)) LIKE '%INSUMO%'
             THEN 'INSUMO'
           WHEN UPPER(TRIM(c.codigo)) IN ('MAT-EMP', 'EMPAQUE')
             OR UPPER(TRIM(c.nombre)) LIKE '%EMPAQUE%'
             THEN 'EMPAQUE'
           ELSE 'MP'
         END
         FROM categorias_productos AS c
         WHERE p.categoria_producto_id = c.id
           AND p.tipo_producto IS NULL`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `UPDATE productos SET tipo_producto = 'MP' WHERE tipo_producto IS NULL`,
        { transaction },
      );

      await queryInterface.changeColumn(
        'productos',
        'tipo_producto',
        {
          type: DataTypes.STRING(20),
          allowNull: false,
        },
        { transaction },
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE productos DROP CONSTRAINT IF EXISTS ${CONSTRAINT}`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE productos
         ADD CONSTRAINT ${CONSTRAINT}
         CHECK (tipo_producto IN (${TIPOS_PRODUCTO.map((tipo) => `'${tipo}'`).join(', ')}))`,
        { transaction },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const productos = await queryInterface.describeTable('productos', { transaction });

      await queryInterface.sequelize.query(
        `ALTER TABLE productos DROP CONSTRAINT IF EXISTS ${CONSTRAINT}`,
        { transaction },
      );

      if (productos.tipo_producto) {
        await queryInterface.removeColumn('productos', 'tipo_producto', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
