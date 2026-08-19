'use strict';

const uuid = (Sequelize) => ({
  type: Sequelize.UUID,
  defaultValue: Sequelize.literal('gen_random_uuid()'),
  primaryKey: true,
});

const timestamps = (Sequelize) => ({
  created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
  updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
});

const catalogo = (Sequelize, extra = {}) => ({
  id: uuid(Sequelize),
  codigo: { type: Sequelize.STRING(30), allowNull: false, unique: true },
  nombre: { type: Sequelize.STRING(100), allowNull: false },
  descripcion: { type: Sequelize.STRING(255), allowNull: true },
  ...extra,
  estado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
  ...timestamps(Sequelize),
});

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tipos_inspeccion', catalogo(Sequelize));
    await queryInterface.createTable(
      'unidades_medida',
      catalogo(Sequelize, { simbolo: { type: Sequelize.STRING(20), allowNull: false } }),
    );
    await queryInterface.createTable(
      'tipos_campo',
      catalogo(Sequelize, {
        permite_opciones: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        permite_unidad: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      }),
    );
    await queryInterface.createTable(
      'niveles_severidad',
      catalogo(Sequelize, { orden: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 } }),
    );
    await queryInterface.createTable('tipos_accion', catalogo(Sequelize));
    await queryInterface.createTable('lugares_inspeccion', catalogo(Sequelize));
    await queryInterface.createTable('parametros_calidad', {
      ...catalogo(Sequelize),
      unidad_medida_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'unidades_medida', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
    });

    await queryInterface.addIndex('parametros_calidad', ['unidad_medida_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('parametros_calidad');
    await queryInterface.dropTable('lugares_inspeccion');
    await queryInterface.dropTable('tipos_accion');
    await queryInterface.dropTable('niveles_severidad');
    await queryInterface.dropTable('tipos_campo');
    await queryInterface.dropTable('unidades_medida');
    await queryInterface.dropTable('tipos_inspeccion');
  },
};
