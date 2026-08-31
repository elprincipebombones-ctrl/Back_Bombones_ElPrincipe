'use strict';

const pk = (Sequelize) => ({
  type: Sequelize.UUID,
  defaultValue: Sequelize.literal('gen_random_uuid()'),
  primaryKey: true,
});

const timestamps = (Sequelize) => ({
  created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
  updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
});

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const options = { transaction };

      await queryInterface.createTable(
        'categorias_lugar_inspeccion',
        {
          id: pk(Sequelize),
          nombre: { type: Sequelize.STRING(100), allowNull: false, unique: true },
          orden: { type: Sequelize.INTEGER, allowNull: false, unique: true },
          activo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
          ...timestamps(Sequelize),
        },
        options,
      );

      await queryInterface.addColumn(
        'lugares_inspeccion',
        'categoria_lugar_inspeccion_id',
        {
          type: Sequelize.UUID,
          allowNull: true,
        },
        options,
      );
      await queryInterface.addColumn(
        'lugares_inspeccion',
        'orden',
        { type: Sequelize.INTEGER, allowNull: true },
        options,
      );
      await queryInterface.addColumn(
        'lugares_inspeccion',
        'activo',
        { type: Sequelize.BOOLEAN, allowNull: true },
        options,
      );

      await queryInterface.sequelize.query(
        `INSERT INTO categorias_lugar_inspeccion
           (id, nombre, orden, activo, created_at, updated_at)
         VALUES (gen_random_uuid(), 'GENERAL', 1, true, NOW(), NOW())
         ON CONFLICT (nombre) DO NOTHING`,
        options,
      );

      await queryInterface.sequelize.query(
        `WITH general AS (
           SELECT id FROM categorias_lugar_inspeccion WHERE nombre = 'GENERAL'
         ),
         ordenados AS (
           SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) + 1 AS nuevo_orden
           FROM lugares_inspeccion
         )
         UPDATE lugares_inspeccion li
         SET categoria_lugar_inspeccion_id = general.id,
             orden = ordenados.nuevo_orden,
             activo = li.estado
         FROM general, ordenados
         WHERE li.id = ordenados.id`,
        options,
      );

      await queryInterface.changeColumn(
        'lugares_inspeccion',
        'categoria_lugar_inspeccion_id',
        {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'categorias_lugar_inspeccion', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        options,
      );
      await queryInterface.changeColumn(
        'lugares_inspeccion',
        'orden',
        { type: Sequelize.INTEGER, allowNull: false },
        options,
      );
      await queryInterface.changeColumn(
        'lugares_inspeccion',
        'activo',
        { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        options,
      );

      await queryInterface.removeColumn('lugares_inspeccion', 'codigo', options);
      await queryInterface.removeColumn('lugares_inspeccion', 'descripcion', options);
      await queryInterface.removeColumn('lugares_inspeccion', 'estado', options);

      await queryInterface.addConstraint('lugares_inspeccion', {
        fields: ['categoria_lugar_inspeccion_id', 'nombre'],
        type: 'unique',
        name: 'uq_lugares_inspeccion_categoria_nombre',
        transaction,
      });
      await queryInterface.addConstraint('lugares_inspeccion', {
        fields: ['categoria_lugar_inspeccion_id', 'orden'],
        type: 'unique',
        name: 'uq_lugares_inspeccion_categoria_orden',
        transaction,
      });
      await queryInterface.addIndex(
        'lugares_inspeccion',
        ['categoria_lugar_inspeccion_id', 'activo', 'orden'],
        options,
      );
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const options = { transaction };

      await queryInterface.addColumn(
        'lugares_inspeccion',
        'codigo',
        { type: Sequelize.STRING(30), allowNull: true },
        options,
      );
      await queryInterface.addColumn(
        'lugares_inspeccion',
        'descripcion',
        { type: Sequelize.STRING(255), allowNull: true },
        options,
      );
      await queryInterface.addColumn(
        'lugares_inspeccion',
        'estado',
        { type: Sequelize.BOOLEAN, allowNull: true },
        options,
      );
      await queryInterface.sequelize.query(
        `UPDATE lugares_inspeccion
         SET codigo = 'LEG_' || SUBSTRING(id::text, 1, 8),
             estado = activo`,
        options,
      );
      await queryInterface.changeColumn(
        'lugares_inspeccion',
        'codigo',
        { type: Sequelize.STRING(30), allowNull: false, unique: true },
        options,
      );
      await queryInterface.changeColumn(
        'lugares_inspeccion',
        'estado',
        { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        options,
      );

      await queryInterface.removeConstraint(
        'lugares_inspeccion',
        'uq_lugares_inspeccion_categoria_nombre',
        options,
      );
      await queryInterface.removeConstraint(
        'lugares_inspeccion',
        'uq_lugares_inspeccion_categoria_orden',
        options,
      );
      await queryInterface.removeColumn(
        'lugares_inspeccion',
        'categoria_lugar_inspeccion_id',
        options,
      );
      await queryInterface.removeColumn('lugares_inspeccion', 'orden', options);
      await queryInterface.removeColumn('lugares_inspeccion', 'activo', options);
      await queryInterface.dropTable('categorias_lugar_inspeccion', options);
    });
  },
};
