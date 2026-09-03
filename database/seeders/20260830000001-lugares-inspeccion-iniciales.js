'use strict';

const datos = [
  {
    nombre: 'GENERAL',
    orden: 1,
    lugares: ['No aplica'],
  },
  {
    nombre: 'TERRAZA',
    orden: 2,
    lugares: [
      'Tanque de almacenamiento #1',
      'Tanque de almacenamiento #2',
      'Tanque de agua fría #3',
      'Canilla de agua potable tanques',
    ],
  },
  {
    nombre: 'NIVEL 2',
    orden: 3,
    lugares: [
      'Filtro ingreso sótano a la empresa',
      'Canilla manguera sótano ingreso a la empresa',
      'Lavamanos baños mujeres',
      'Lavamanos baños hombres',
      'Canilla producción salsas tanque de agua',
      'Canilla manguera doble producción salsas',
      'Canilla lavadero producción salsas',
      'Filtro lavabotas entrada planta',
      'Filtro lavamanos entrada planta',
      'Canilla #1 bomboneros (al lado de la puerta de ingreso)',
      'Canilla #2 bomboneros - surtidor',
      'Canilla manguera apanado',
      'Canilla lavado apanado',
      'Ducha sótano',
    ],
  },
  {
    nombre: 'NIVEL 1',
    orden: 4,
    lugares: [
      'Filtro lavabotas entrada planta por escaleras',
      'Filtro lavamanos entrada planta por escaleras',
      'Canilla posuelo entrada planta por escaleras',
      'Filtro lavabotas entrada del exterior',
      'Filtro lavamanos entrada del exterior',
      'Canilla lavado carros (logística)',
      'Lavamanos #1 planta de producción',
      'Canilla zona canastas limpias',
      'Canilla #2 zona canastas limpias',
      'Canilla zona de horno',
      'Canilla embutido salchichas',
      'Canilla molienda fría',
      'Canilla molienda #2',
      'Canilla deshuesado de pollo',
      'Canilla zona de adobo',
      'Canilla entrada trasera (escaleras)',
      'Lavamanos #2 planta de producción',
      'Lavacanastas',
    ],
  },
];

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      for (const categoria of datos) {
        await queryInterface.sequelize.query(
          `INSERT INTO categorias_lugar_inspeccion
             (id, nombre, orden, activo, created_at, updated_at)
           VALUES (gen_random_uuid(), :nombre, :orden, true, NOW(), NOW())
           ON CONFLICT (nombre) DO NOTHING`,
          {
            replacements: { nombre: categoria.nombre, orden: categoria.orden },
            transaction,
          },
        );

        const [registros] = await queryInterface.sequelize.query(
          `SELECT id
           FROM categorias_lugar_inspeccion
           WHERE nombre = :nombre`,
          { replacements: { nombre: categoria.nombre }, transaction },
        );
        const categoriaId = registros[0].id;

        for (const [indice, nombre] of categoria.lugares.entries()) {
          await queryInterface.sequelize.query(
            `INSERT INTO lugares_inspeccion
               (id, nombre, categoria_lugar_inspeccion_id, orden, activo, created_at, updated_at)
             VALUES (gen_random_uuid(), :nombre, :categoriaId, :orden, true, NOW(), NOW())
             ON CONFLICT (categoria_lugar_inspeccion_id, nombre) DO NOTHING`,
            {
              replacements: { nombre, categoriaId, orden: indice + 1 },
              transaction,
            },
          );
        }
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      for (const categoria of datos) {
        await queryInterface.sequelize.query(
          `DELETE FROM lugares_inspeccion
           WHERE categoria_lugar_inspeccion_id = (
             SELECT id FROM categorias_lugar_inspeccion WHERE nombre = :categoria
           )
             AND nombre IN (:lugares)`,
          {
            replacements: {
              categoria: categoria.nombre,
              lugares: categoria.lugares,
            },
            transaction,
          },
        );
      }

      await queryInterface.sequelize.query(
        `DELETE FROM categorias_lugar_inspeccion categoria
         WHERE categoria.nombre IN (:categorias)
           AND NOT EXISTS (
             SELECT 1
             FROM lugares_inspeccion lugar
             WHERE lugar.categoria_lugar_inspeccion_id = categoria.id
           )`,
        {
          replacements: { categorias: datos.map((categoria) => categoria.nombre) },
          transaction,
        },
      );
    });
  },
};
