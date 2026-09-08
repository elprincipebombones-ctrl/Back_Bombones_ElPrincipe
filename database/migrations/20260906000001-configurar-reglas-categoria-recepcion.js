const { DataTypes } = require('sequelize');

const agregarColumnaSiFalta = async (queryInterface, tabla, columna, definicion) => {
  const estructura = await queryInterface.describeTable(tabla);
  if (!estructura[columna]) {
    await queryInterface.addColumn(tabla, columna, definicion);
  }
};

module.exports = {
  async up(queryInterface) {
    await agregarColumnaSiFalta(queryInterface, 'categorias_productos', 'requiere_lote', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await agregarColumnaSiFalta(
      queryInterface,
      'categorias_productos',
      'requiere_fecha_vencimiento',
      {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    );
    await agregarColumnaSiFalta(queryInterface, 'categorias_productos', 'requiere_temperatura', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.sequelize.query(`
      UPDATE categorias_productos
      SET
        requiere_lote = CASE
          WHEN UPPER(TRIM(nombre)) IN (
            'MP CÁRNICAS',
            'MP NO CÁRNICAS',
            'INSUMOS',
            'MATERIAL DE EMPAQUE'
          ) THEN TRUE
          ELSE requiere_lote
        END,
        requiere_fecha_vencimiento = CASE
          WHEN UPPER(TRIM(nombre)) IN (
            'MP CÁRNICAS',
            'MP NO CÁRNICAS',
            'MATERIAL DE EMPAQUE'
          ) THEN TRUE
          WHEN UPPER(TRIM(nombre)) = 'INSUMOS' THEN FALSE
          ELSE requiere_fecha_vencimiento
        END,
        requiere_temperatura = CASE
          WHEN UPPER(TRIM(nombre)) = 'MP CÁRNICAS' THEN TRUE
          WHEN UPPER(TRIM(nombre)) IN (
            'MP NO CÁRNICAS',
            'INSUMOS',
            'MATERIAL DE EMPAQUE'
          ) THEN FALSE
          ELSE requiere_temperatura
        END
    `);

    await agregarColumnaSiFalta(queryInterface, 'temperaturas_recepcion', 'detalle_recepcion_id', {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'detalles_recepcion',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    const indices = await queryInterface.showIndex('temperaturas_recepcion');
    if (!indices.some((indice) => indice.name === 'temperaturas_recepcion_detalle_unique')) {
      await queryInterface.addIndex('temperaturas_recepcion', ['detalle_recepcion_id'], {
        name: 'temperaturas_recepcion_detalle_unique',
        unique: true,
        where: {
          detalle_recepcion_id: {
            [require('sequelize').Op.ne]: null,
          },
        },
      });
    }
  },

  async down(queryInterface) {
    const indices = await queryInterface.showIndex('temperaturas_recepcion');
    if (indices.some((indice) => indice.name === 'temperaturas_recepcion_detalle_unique')) {
      await queryInterface.removeIndex(
        'temperaturas_recepcion',
        'temperaturas_recepcion_detalle_unique',
      );
    }

    const temperaturas = await queryInterface.describeTable('temperaturas_recepcion');
    if (temperaturas.detalle_recepcion_id) {
      await queryInterface.removeColumn('temperaturas_recepcion', 'detalle_recepcion_id');
    }

    const categorias = await queryInterface.describeTable('categorias_productos');
    for (const columna of ['requiere_temperatura', 'requiere_fecha_vencimiento', 'requiere_lote']) {
      if (categorias[columna]) {
        await queryInterface.removeColumn('categorias_productos', columna);
      }
    }
  },
};
