const { QueryTypes } = require('sequelize');
const {
  AccionCorrectiva,
  AprobadorAccionCorrectiva,
  sequelize,
  TareaAccionCorrectiva,
  Usuario,
} = require('../../models');
const { presentarTarea } = require('./tareas-accion-correctiva.service');

const CONSULTA_RESUMEN = `
  WITH parametros AS (
    SELECT COALESCE(CAST(:fecha AS DATE), (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::date) AS fecha
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

const CONSULTA_GRAFICOS = `
  WITH dias AS (
    SELECT fecha::date FROM generate_series(
      COALESCE(CAST(:fecha AS date), (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::date) - 6,
      COALESCE(CAST(:fecha AS date), (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::date), interval '1 day'
    ) fecha
  ), serie AS (
    SELECT d.fecha,
      COUNT(pf.id)::int AS programadas,
      COUNT(pf.id) FILTER (WHERE EXISTS (
        SELECT 1 FROM inspecciones i JOIN versiones_formato vf ON vf.id = i.version_formato_id
        WHERE vf.formato_calidad_id = pf.formato_calidad_id AND i.fecha_inspeccion = d.fecha
      ))::int AS ejecutadas
    FROM dias d LEFT JOIN programaciones_formato pf ON pf.activo = true
      AND d.fecha >= pf.fecha_inicio AND (pf.fecha_fin IS NULL OR d.fecha <= pf.fecha_fin)
      AND EXISTS (SELECT 1 FROM dias_programacion dp WHERE dp.programacion_formato_id = pf.id
        AND dp.dia_semana = EXTRACT(ISODOW FROM d.fecha)::int)
    GROUP BY d.fecha
  )
  SELECT (SELECT json_agg(serie ORDER BY fecha) FROM serie) AS serie_semanal,
    json_build_object(
      'pendientes', COUNT(*) FILTER (WHERE estado = 'PENDIENTE'),
      'en_proceso', COUNT(*) FILTER (WHERE estado = 'EN_PROCESO'),
      'por_aprobar', COUNT(*) FILTER (WHERE estado = 'PENDIENTE_APROBACION'),
      'cerradas', COUNT(*) FILTER (WHERE estado = 'CERRADA')
    ) AS acciones_por_estado
  FROM acciones_correctivas
`;

const obtenerGraficos = async (fecha, database = sequelize) => {
  const [datos] = await database.query(CONSULTA_GRAFICOS, {
    replacements: { fecha: fecha || null },
    type: QueryTypes.SELECT,
  });
  return datos;
};

const obtenerResumen = async (fecha, usuario) => {
  const [resultado] = await sequelize.query(CONSULTA_RESUMEN, {
    replacements: { fecha: fecha || null },
    type: QueryTypes.SELECT,
  });

  const puedeVerTodas =
    usuario?.rol?.nombre === 'Administrador' ||
    !!(await AprobadorAccionCorrectiva.findOne({
      where: { usuarioId: usuario.id, estado: true },
      attributes: ['id'],
    }));
  const whereTareas = { estado: 'PENDIENTE' };
  if (!puedeVerTodas) whereTareas.usuarioAsignadoId = usuario.id;

  const [totalTareas, tareas] = await Promise.all([
    TareaAccionCorrectiva.count({ where: whereTareas }),
    TareaAccionCorrectiva.findAll({
      where: whereTareas,
      include: [
        { model: Usuario, as: 'usuarioAsignado', attributes: ['id', 'nombre', 'correo'] },
        { model: AccionCorrectiva, as: 'accionCorrectiva', attributes: ['id'] },
      ],
      order: [
        ['fechaLimite', 'ASC'],
        ['created_at', 'ASC'],
      ],
      limit: 3,
    }),
  ]);

  return {
    ...(await obtenerGraficos(fecha)),
    programadas: numero(resultado.programadas),
    ejecutadas: numero(resultado.ejecutadas),
    pendientes: numero(resultado.pendientes),
    cumplimiento_porcentaje: numero(resultado.cumplimiento_porcentaje),
    acciones_abiertas: numero(resultado.acciones_abiertas),
    pendientes_aprobacion: numero(resultado.pendientes_aprobacion),
    tareas_pendientes_total: totalTareas,
    tareas_pendientes: tareas.map(presentarTarea),
    tareas_visibilidad_global: puedeVerTodas,
  };
};

module.exports = { obtenerResumen, obtenerGraficos, CONSULTA_GRAFICOS };
