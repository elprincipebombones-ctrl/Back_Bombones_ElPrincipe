const BASE = `
  SELECT i.id, i.fecha_inicio, i.fecha_cierre, i.estado, i.observaciones,
    ti.nombre AS tipo_inspeccion, f.codigo AS formato, f.nombre AS nombre_formato,
    vf.numero_version AS version, l.nombre AS lugar, u.nombre AS responsable,
    o.numero AS ot, p.codigo AS codigo_producto, p.nombre AS producto,
    i.lote, i.fecha_vencimiento,
    (SELECT count(*)::int FROM desviaciones d WHERE d.inspeccion_id = i.id) AS desviaciones,
    (SELECT count(*)::int FROM acciones_correctivas a JOIN desviaciones d ON d.id = a.desviacion_id
      WHERE d.inspeccion_id = i.id) AS acciones
  FROM inspecciones i
  JOIN versiones_formato vf ON vf.id = i.version_formato_id
  JOIN formatos_calidad f ON f.id = vf.formato_calidad_id
  JOIN tipos_inspeccion ti ON ti.id = f.tipo_inspeccion_id
  LEFT JOIN lugares_inspeccion l ON l.id = i.lugar_inspeccion_id
  LEFT JOIN usuarios u ON u.id = i.iniciada_por
  LEFT JOIN ordenes_produccion o ON o.id = i.orden_produccion_id
  LEFT JOIN productos p ON p.id = i.producto_id
  WHERE i.fecha_inicio >= (:fechaInicio::date::timestamp AT TIME ZONE 'America/Bogota')
    AND i.fecha_inicio < ((:fechaFin::date + 1)::timestamp AT TIME ZONE 'America/Bogota')
    AND (:tipoId::uuid IS NULL OR ti.id = :tipoId::uuid)
    AND (:formatoId::uuid IS NULL OR f.id = :formatoId::uuid)
    AND (:lugarId::uuid IS NULL OR i.lugar_inspeccion_id = :lugarId::uuid)
    AND (:productoId::uuid IS NULL OR i.producto_id = :productoId::uuid)
    AND (:ordenId::uuid IS NULL OR i.orden_produccion_id = :ordenId::uuid)
    AND (:estado::text IS NULL OR i.estado::text = :estado)
    AND (NOT :soloDesviaciones::boolean OR EXISTS
      (SELECT 1 FROM desviaciones d WHERE d.inspeccion_id = i.id))
    AND (NOT :soloAcciones::boolean OR EXISTS
      (SELECT 1 FROM desviaciones d JOIN acciones_correctivas a ON a.desviacion_id = d.id
       WHERE d.inspeccion_id = i.id))
    AND (:estadoAccion::text IS NULL OR EXISTS
      (SELECT 1 FROM desviaciones d JOIN acciones_correctivas a ON a.desviacion_id = d.id
       WHERE d.inspeccion_id = i.id AND a.estado::text = :estadoAccion))
`;

const RESPUESTAS = `
  SELECT r.id, r.inspeccion_id, 'CAMPO' AS origen, s.nombre AS seccion,
    c.etiqueta AS campo, pc.nombre AS parametro, tc.codigo AS tipo,
    COALESCE(um.simbolo, up.simbolo) AS unidad, c.es_calculado,
    COALESCE(c.valor_minimo, pc.valor_minimo) AS valor_minimo,
    COALESCE(c.valor_maximo, pc.valor_maximo) AS valor_maximo,
    r.valor_texto, r.valor_numero, r.valor_booleano, r.valor_fecha, r.valor_hora,
    r.valor_fecha_hora, r.valor_json, r.observacion, r.fecha_guardado,
    (SELECT jsonb_agg(jsonb_build_object('valor', oc.valor, 'etiqueta', oc.etiqueta) ORDER BY oc.orden)
      FROM respuestas_opciones ro JOIN opciones_campo oc ON oc.id = ro.opcion_campo_id
      WHERE ro.respuesta_inspeccion_id = r.id) AS opciones
  FROM respuestas_inspeccion r JOIN campos_formato c ON c.id = r.campo_formato_id
  JOIN secciones_formato s ON s.id = c.seccion_formato_id
  JOIN tipos_campo tc ON tc.id = c.tipo_campo_id
  LEFT JOIN parametros_calidad pc ON pc.id = c.parametro_calidad_id
  LEFT JOIN unidades_medida um ON um.id = c.unidad_medida_id
  LEFT JOIN unidades_medida up ON up.id = pc.unidad_medida_id
  WHERE r.inspeccion_id IN (:ids) ORDER BY s.orden, c.orden, r.id
`;

const CHECKLISTS = `
  SELECT r.id, r.inspeccion_id, 'CHECKLIST' AS origen, s.nombre AS seccion,
    cs.nombre AS checklist, ec.nombre_snapshot AS elemento, ci.nombre AS criterio,
    tc.codigo AS tipo, ci.resultado_esperado, r.resultado, r.cumple,
    r.observacion, r.evidencia_url AS evidencia, r.fecha_guardado
  FROM respuestas_elemento_checklist r
  JOIN checklists_seccion cs ON cs.id = r.checklist_seccion_id
  JOIN secciones_formato s ON s.id = cs.seccion_formato_id
  JOIN elementos_checklist ec ON ec.id = r.elemento_checklist_id
  JOIN criterios_inspeccion ci ON ci.id = r.criterio_inspeccion_id
  JOIN tipos_campo tc ON tc.id = ci.tipo_campo_id
  WHERE r.inspeccion_id IN (:ids) ORDER BY s.orden, cs.orden, ec.orden, r.id
`;

const DESVIACIONES = `
  SELECT d.id, d.inspeccion_id, d.respuesta_inspeccion_id, d.respuesta_elemento_checklist_id,
    d.estado, d.descripcion AS observacion, d.mensaje, d.fecha_deteccion,
    ns.nombre AS severidad, rg.codigo AS regla, rg.nombre AS nombre_regla,
    rg.operador_logico,
    rg.resultado AS resultado_regla, rg.mensaje_incumplimiento AS mensaje_regla,
    ci.nombre AS criterio, ci.resultado_esperado,
    (SELECT jsonb_agg(jsonb_build_object(
      'tipo', cr.tipo_condicion, 'operador', cr.operador, 'valor_1', cr.valor_1,
      'valor_2', cr.valor_2, 'valores', cr.valor_json) ORDER BY cr.orden)
      FROM condiciones_regla cr WHERE cr.regla_calidad_id = d.regla_calidad_id) AS condiciones
  FROM desviaciones d LEFT JOIN niveles_severidad ns ON ns.id = d.nivel_severidad_id
  LEFT JOIN reglas_calidad rg ON rg.id = d.regla_calidad_id
  LEFT JOIN respuestas_elemento_checklist rc ON rc.id = d.respuesta_elemento_checklist_id
  LEFT JOIN criterios_inspeccion ci ON ci.id = rc.criterio_inspeccion_id
  WHERE d.inspeccion_id IN (:ids) ORDER BY d.fecha_deteccion, d.id
`;

const ACCIONES = `
  SELECT a.id, d.inspeccion_id, a.desviacion_id, ta.nombre AS tipo_accion,
    a.estado, a.descripcion, a.created_at AS fecha_creacion, a.fecha_asignacion,
    a.fecha_inicio, a.fecha_limite, u.nombre AS responsable,
    a.fecha_envio_aprobacion, ue.nombre AS enviada_por,
    a.fecha_cierre AS fecha_aprobacion_cierre, uc.nombre AS aprobador,
    a.observacion_cierre
  FROM acciones_correctivas a JOIN desviaciones d ON d.id = a.desviacion_id
  LEFT JOIN tipos_accion ta ON ta.id = a.tipo_accion_id
  LEFT JOIN usuarios u ON u.id = a.responsable_id
  LEFT JOIN usuarios ue ON ue.id = a.enviada_aprobacion_por
  LEFT JOIN usuarios uc ON uc.id = a.cerrada_por
  WHERE d.inspeccion_id IN (:ids) ORDER BY a.created_at, a.id
`;

const CAMPOS = `
  SELECT c.accion_correctiva_id, c.codigo, c.nombre, c.obligatorio, c.valor_texto AS valor
  FROM campos_accion_instancia c JOIN acciones_correctivas a ON a.id = c.accion_correctiva_id
  JOIN desviaciones d ON d.id = a.desviacion_id
  WHERE d.inspeccion_id IN (:ids) ORDER BY c.orden, c.id
`;

const SEGUIMIENTOS = `
  SELECT s.id, s.accion_correctiva_id, s.tipo_registro AS tipo, s.descripcion,
    s.valor_numero, s.valor_texto, s.valor_booleano, um.simbolo AS unidad,
    s.resultado_cumple, u.nombre AS registrado_por, s.fecha_registro
  FROM seguimientos_accion_correctiva s JOIN acciones_correctivas a ON a.id = s.accion_correctiva_id
  JOIN desviaciones d ON d.id = a.desviacion_id
  LEFT JOIN usuarios u ON u.id = s.registrado_por
  LEFT JOIN unidades_medida um ON um.id = s.unidad_medida_id
  WHERE d.inspeccion_id IN (:ids) ORDER BY s.fecha_registro, s.id
`;

const EVIDENCIAS = `
  SELECT e.id, e.accion_correctiva_id, e.seguimiento_accion_correctiva_id,
    e.tarea_accion_correctiva_id, e.nombre_archivo, e.tipo_archivo, e.descripcion,
    e.fecha_carga, u.nombre AS subido_por, s.tipo_registro AS seguimiento_relacionado,
    t.descripcion AS tarea_relacionada
  FROM evidencias_accion_correctiva e JOIN acciones_correctivas a ON a.id = e.accion_correctiva_id
  JOIN desviaciones d ON d.id = a.desviacion_id
  LEFT JOIN usuarios u ON u.id = e.subido_por
  LEFT JOIN seguimientos_accion_correctiva s ON s.id = e.seguimiento_accion_correctiva_id
  LEFT JOIN tareas_accion_correctiva t ON t.id = e.tarea_accion_correctiva_id
  WHERE d.inspeccion_id IN (:ids) ORDER BY e.fecha_carga, e.id
`;

const TAREAS = `
  SELECT t.id, t.accion_correctiva_id, t.descripcion, t.documentacion, t.estado,
    t.fecha_limite, t.fecha_completada, u.nombre AS responsable
  FROM tareas_accion_correctiva t JOIN acciones_correctivas a ON a.id = t.accion_correctiva_id
  JOIN desviaciones d ON d.id = a.desviacion_id LEFT JOIN usuarios u ON u.id = t.usuario_asignado_id
  WHERE d.inspeccion_id IN (:ids) ORDER BY t.fecha_limite, t.id
`;

module.exports = {
  BASE,
  RESPUESTAS,
  CHECKLISTS,
  DESVIACIONES,
  ACCIONES,
  CAMPOS,
  SEGUIMIENTOS,
  EVIDENCIAS,
  TAREAS,
};
