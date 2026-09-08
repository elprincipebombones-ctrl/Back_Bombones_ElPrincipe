module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE categorias_productos
      SET
        nombre = 'MP CÁRNICAS',
        requiere_lote = TRUE,
        requiere_fecha_vencimiento = TRUE,
        requiere_temperatura = TRUE,
        updated_at = NOW()
      WHERE codigo = 'MP-CAR'
         OR UPPER(TRIM(nombre)) IN ('MP CÁRNICAS', 'MP CARNICAS', 'MATERIA PRIMA CÁRNICA')
    `);

    await queryInterface.sequelize.query(`
      UPDATE categorias_productos
      SET
        nombre = 'MP NO CÁRNICAS',
        requiere_lote = TRUE,
        requiere_fecha_vencimiento = TRUE,
        requiere_temperatura = FALSE,
        updated_at = NOW()
      WHERE codigo IN ('MP-NO-CAR', 'MP-NO-PERECEDERA')
         OR UPPER(TRIM(nombre)) IN (
           'MP NO CÁRNICAS',
           'MP NO CARNICAS',
           'MATERIA PRIMA NO PERECEDERA'
         )
    `);

    await queryInterface.sequelize.query(`
      INSERT INTO categorias_productos (
        id,
        codigo,
        nombre,
        descripcion,
        clasificacion_mp,
        requiere_lote,
        requiere_fecha_vencimiento,
        requiere_temperatura,
        estado,
        created_at,
        updated_at
      )
      SELECT
        '8ab19efe-f93e-4e35-9b8d-b1a369bc6c01',
        'INS',
        'INSUMOS',
        'Insumos utilizados en producción',
        'NO_PERECEDERA',
        TRUE,
        FALSE,
        FALSE,
        TRUE,
        NOW(),
        NOW()
      WHERE NOT EXISTS (
        SELECT 1
        FROM categorias_productos
        WHERE codigo = 'INS' OR UPPER(TRIM(nombre)) = 'INSUMOS'
      )
    `);

    await queryInterface.sequelize.query(`
      UPDATE categorias_productos
      SET
        nombre = 'INSUMOS',
        requiere_lote = TRUE,
        requiere_fecha_vencimiento = FALSE,
        requiere_temperatura = FALSE,
        updated_at = NOW()
      WHERE codigo = 'INS' OR UPPER(TRIM(nombre)) = 'INSUMOS'
    `);

    await queryInterface.sequelize.query(`
      INSERT INTO categorias_productos (
        id,
        codigo,
        nombre,
        descripcion,
        clasificacion_mp,
        requiere_lote,
        requiere_fecha_vencimiento,
        requiere_temperatura,
        estado,
        created_at,
        updated_at
      )
      SELECT
        '8ab19efe-f93e-4e35-9b8d-b1a369bc6c02',
        'MAT-EMP',
        'MATERIAL DE EMPAQUE',
        'Material utilizado para empaque',
        'NO_PERECEDERA',
        TRUE,
        TRUE,
        FALSE,
        TRUE,
        NOW(),
        NOW()
      WHERE NOT EXISTS (
        SELECT 1
        FROM categorias_productos
        WHERE codigo = 'MAT-EMP' OR UPPER(TRIM(nombre)) = 'MATERIAL DE EMPAQUE'
      )
    `);

    await queryInterface.sequelize.query(`
      UPDATE categorias_productos
      SET
        nombre = 'MATERIAL DE EMPAQUE',
        requiere_lote = TRUE,
        requiere_fecha_vencimiento = TRUE,
        requiere_temperatura = FALSE,
        updated_at = NOW()
      WHERE codigo = 'MAT-EMP' OR UPPER(TRIM(nombre)) = 'MATERIAL DE EMPAQUE'
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE categorias_productos
      SET
        requiere_lote = FALSE,
        requiere_fecha_vencimiento = FALSE,
        requiere_temperatura = FALSE,
        updated_at = NOW()
      WHERE nombre IN (
        'MP CÁRNICAS',
        'MP NO CÁRNICAS',
        'INSUMOS',
        'MATERIAL DE EMPAQUE'
      )
    `);
  },
};
