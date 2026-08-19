const db = require('../models');

const ejecutar = async () => {
  const [parametros] = await db.sequelize.query(`
    SELECT p.codigo parametro, p.nombre, p.unidad_medida_id,
      COUNT(DISTINCT c.id)::int campos,
      COUNT(DISTINCT r.id)::int reglas, p.valor_minimo, p.valor_maximo,
      p.precision_decimal, tc.codigo tipo_campo, u.codigo unidad
    FROM parametros_calidad p
    LEFT JOIN tipos_campo tc ON tc.id = p.tipo_campo_id
    LEFT JOIN unidades_medida u ON u.id = p.unidad_medida_id
    LEFT JOIN campos_formato c ON c.parametro_calidad_id = p.id
    LEFT JOIN reglas_calidad r ON r.parametro_calidad_id = p.id
    GROUP BY p.id, tc.codigo, u.codigo
    ORDER BY p.codigo
  `);
  const [reglas] = await db.sequelize.query(`
    SELECT p.codigo parametro, r.codigo regla, r.resultado, r.estado,
      r.campo_formato_id
    FROM reglas_calidad r
    JOIN parametros_calidad p ON p.id = r.parametro_calidad_id
    ORDER BY p.codigo, r.codigo
  `);
  const [detalle] = await db.sequelize.query(`
    SELECT p.codigo parametro, tc.codigo tipo_campo, u.codigo unidad,
      p.valor_minimo, p.valor_maximo, p.precision_decimal,
      p.es_obligatorio_default, p.bloquear_al_guardar_default,
      r.codigo regla, r.resultado, r.estado, cr.operador, cr.valor_1, cr.valor_2,
      ns.codigo severidad,
      COALESCE(array_agg(ta.codigo ORDER BY ar.orden)
        FILTER (WHERE ta.codigo IS NOT NULL), '{}') acciones
    FROM reglas_calidad r
    JOIN parametros_calidad p ON p.id = r.parametro_calidad_id
    JOIN tipos_campo tc ON tc.id = p.tipo_campo_id
    LEFT JOIN unidades_medida u ON u.id = p.unidad_medida_id
    LEFT JOIN condiciones_regla cr ON cr.regla_calidad_id = r.id AND cr.estado
    LEFT JOIN niveles_severidad ns ON ns.id = r.nivel_severidad_id
    LEFT JOIN acciones_regla ar ON ar.regla_calidad_id = r.id AND ar.estado
    LEFT JOIN tipos_accion ta ON ta.id = ar.tipo_accion_id
    GROUP BY p.codigo, tc.codigo, u.codigo, p.valor_minimo, p.valor_maximo,
      p.precision_decimal, p.es_obligatorio_default, p.bloquear_al_guardar_default,
      r.codigo, r.resultado, r.estado, cr.operador, cr.valor_1, cr.valor_2, ns.codigo
    ORDER BY p.codigo, r.codigo
  `);
  console.log(JSON.stringify({ parametros, reglas, detalle }, null, 2));
};

ejecutar()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.sequelize.close());
