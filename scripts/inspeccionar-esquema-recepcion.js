const sequelize = require('../database/database');

const ejecutar = async () => {
  const [tablas] = await sequelize.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND (
        table_name LIKE '%recepcion%'
        OR table_name LIKE '%movimiento%'
        OR table_name IN ('productos', 'categorias_productos', 'materias_primas')
      )
    ORDER BY table_name
  `);
  const [columnas] = await sequelize.query(`
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN (
        'recepciones', 'detalles_recepcion', 'temperaturas_recepcion',
        'categorias_productos', 'movimientos_inventario', 'detalle_movimiento'
      )
    ORDER BY table_name, ordinal_position
  `);
  const [conteos] = await sequelize.query(`
    SELECT 'recepciones' AS tabla, COUNT(*)::int AS total FROM recepciones
    UNION ALL SELECT 'detalles_recepcion', COUNT(*)::int FROM detalles_recepcion
    UNION ALL SELECT 'movimientos_inventario', COUNT(*)::int FROM movimientos_inventario
    UNION ALL SELECT 'detalle_movimiento', COUNT(*)::int FROM detalle_movimiento
    UNION ALL SELECT 'categorias_sin_clasificacion', COUNT(*)::int
      FROM categorias_productos WHERE clasificacion_mp IS NULL
  `);
  const [tablasEliminadas] = await sequelize.query(`
    SELECT nombre, to_regclass('public.' || nombre) IS NULL AS eliminada
    FROM (VALUES
      ('detalles_movimiento_inventario'),
      ('verificaciones_limpieza_recepcion')
    ) AS antiguas(nombre)
  `);
  const [columnasEliminadas] = await sequelize.query(`
    SELECT tabla, columna, NOT EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = objetivo.tabla
        AND c.column_name = objetivo.columna
    ) AS eliminada
    FROM (VALUES
      ('recepciones', 'tipo_recepcion'),
      ('recepciones', 'lote'),
      ('movimientos_inventario', 'tipo_movimiento'),
      ('movimientos_inventario', 'fecha_movimiento'),
      ('movimientos_inventario', 'recepcion_id')
    ) AS objetivo(tabla, columna)
  `);
  const [restricciones] = await sequelize.query(`
    SELECT conrelid::regclass::text AS tabla, conname AS nombre,
           pg_get_constraintdef(oid) AS definicion
    FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
      AND conrelid::regclass::text IN (
        'recepciones', 'detalles_recepcion', 'categorias_productos',
        'temperaturas_recepcion', 'movimientos_inventario', 'detalle_movimiento'
      )
    ORDER BY tabla, nombre
  `);
  const [indices] = await sequelize.query(`
    SELECT tablename AS tabla, indexname AS nombre, indexdef AS definicion
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN ('movimientos_inventario', 'detalle_movimiento')
    ORDER BY tablename, indexname
  `);
  const [secuencias] = await sequelize.query(`
    SELECT sequencename
    FROM pg_sequences
    WHERE schemaname = 'public'
      AND sequencename IN ('recepciones_numero_seq', 'movimientos_en_numero_seq')
    ORDER BY sequencename
  `);

  console.log(
    JSON.stringify(
      {
        tablas,
        columnas,
        conteos,
        tablasEliminadas,
        columnasEliminadas,
        restricciones,
        indices,
        secuencias,
      },
      null,
      2,
    ),
  );
  await sequelize.close();
};

ejecutar().catch((error) => {
  console.error(error);
  process.exit(1);
});
