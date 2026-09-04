'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await queryInterface.changeColumn(
        'recepciones',
        'bodega_id',
        {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'bodegas',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        { transaction },
      );

      await sequelize.query(
        `ALTER TABLE recepciones
           DROP CONSTRAINT IF EXISTS recepciones_numero_key1;

         DROP INDEX IF EXISTS detalle_movimiento_producto_id;
         DROP INDEX IF EXISTS detalle_movimiento_movimiento_inventario_id;
         DROP INDEX IF EXISTS detalle_movimiento_lote;
         DROP INDEX IF EXISTS detalle_movimiento_lote_proveedor;`,
        { transaction },
      );
    });
  },

  async down(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await queryInterface.changeColumn(
        'recepciones',
        'bodega_id',
        {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'bodegas',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        { transaction },
      );
      await sequelize.query(
        `CREATE INDEX IF NOT EXISTS detalle_movimiento_producto_id
           ON detalle_movimiento(producto_id);
         CREATE INDEX IF NOT EXISTS detalle_movimiento_movimiento_inventario_id
           ON detalle_movimiento(movimiento_inventario_id);
         CREATE INDEX IF NOT EXISTS detalle_movimiento_lote
           ON detalle_movimiento(lote);
         CREATE INDEX IF NOT EXISTS detalle_movimiento_lote_proveedor
           ON detalle_movimiento(lote_proveedor);`,
        { transaction },
      );
    });
  },
};
