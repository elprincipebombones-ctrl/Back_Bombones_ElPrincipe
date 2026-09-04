'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tablas = (await queryInterface.showAllTables()).map((tabla) =>
      typeof tabla === 'string' ? tabla : tabla.tableName,
    );

    const nombres = [
      'detalles_recepcion',
      'recepciones_vehiculos',
      'temperaturas_recepcion',
      'verificaciones_recepcion',
      'condiciones_ambientales_recepcion',
      'resultados_recepcion',
    ];

    for (const nombre of nombres) {
      if (!tablas.includes(nombre)) {
        await queryInterface.createTable(nombre, {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
            allowNull: false,
          },
        });
      }
    }
  },

  async down() {
    // Sólo permite que la migración histórica de reconstrucción elimine estas tablas auxiliares.
  },
};
