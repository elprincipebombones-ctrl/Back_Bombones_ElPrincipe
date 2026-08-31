const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../models');

const CONSULTA_RESUMEN = `
  WITH parametros AS (
    SELECT COALESCE(CAST(:fecha AS DATE), CURRENT_DATE) AS fecha
  ),
  programadas AS (
    SELECT
      pf.id AS programacion_id,
      pf.formato_calidad_id
    FROM programaciones_formato pf
    INNER JOIN dias_programacion dp
      ON dp.programacion_formato_id = pf.id
    CROSS JOIN parametros p
    WHERE pf.activo = true
      AND p.fecha >= pf.fecha_inicio
      AND (pf.fecha_fin IS NULL OR p.fecha <= pf.fecha_fin)
      AND dp.dia_semana = EXTRACT(ISODOW FROM p.fecha)::INTEGER
  ),
  estado_programacion AS (
    SELECT
      p.programacion_id,
      EXISTS (
        SELECT 1
        FROM inspecciones i
        INNER JOIN versiones_formato vf
          ON vf.id = i.version_formato_id
        CROSS JOIN parametros par
        WHERE vf.formato_calidad_id = p.formato_calidad_id
          AND i.fecha_inspeccion = par.fecha
      ) AS ejecutada
    FROM programadas p
  ),
  resumen_inspecciones AS (
    SELECT
      COUNT(*) AS programadas,
      COUNT(*) FILTER (WHERE ejecutada) AS ejecutadas,
      COUNT(*) FILTER (WHERE NOT ejecutada) AS pendientes
    FROM estado_programacion
  ),
  resumen_acciones AS (
    SELECT
      COUNT(*) FILTER (
        WHERE estado IN ('PENDIENTE', 'EN_PROCESO')
      ) AS acciones_abiertas,
      COUNT(*) FILTER (
        WHERE estado = 'PENDIENTE_APROBACION'
      ) AS pendientes_aprobacion
    FROM acciones_correctivas
  )
  SELECT
    ri.programadas,
    ri.ejecutadas,
    ri.pendientes,
    CASE
      WHEN ri.programadas = 0 THEN 0
      ELSE ROUND(
        (ri.ejecutadas::NUMERIC / ri.programadas::NUMERIC) * 100,
        2
      )
    END AS cumplimiento_porcentaje,
    ra.acciones_abiertas,
    ra.pendientes_aprobacion
  FROM resumen_inspecciones ri
  CROSS JOIN resumen_acciones ra
`;

const numero = (valor) => Number(valor ?? 0);

const obtenerResumen = async (fecha) => {
  const [resultado] = await sequelize.query(CONSULTA_RESUMEN, {
    replacements: { fecha: fecha || null },
    type: QueryTypes.SELECT,
  });

  return {
    programadas: numero(resultado.programadas),
    ejecutadas: numero(resultado.ejecutadas),
    pendientes: numero(resultado.pendientes),
    cumplimiento_porcentaje: numero(resultado.cumplimiento_porcentaje),
    acciones_abiertas: numero(resultado.acciones_abiertas),
    pendientes_aprobacion: numero(resultado.pendientes_aprobacion),
  };
};

module.exports = { obtenerResumen };
