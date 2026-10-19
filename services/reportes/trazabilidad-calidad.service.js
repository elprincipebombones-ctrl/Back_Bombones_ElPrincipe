const { QueryTypes, Transaction } = require('sequelize');
const { sequelize } = require('../../models');
const SQL = require('./trazabilidad-calidad.consultas');

const ESTADOS = ['BORRADOR', 'EN_PROCESO', 'PENDIENTE_ACCION', 'CERRADA', 'CERRADA_INCOMPLETA'];
const ESTADOS_ACCION = ['PENDIENTE', 'EN_PROCESO', 'PENDIENTE_APROBACION', 'CERRADA'];
const REGLA_CONFORMES =
  'Inspecciones cerradas, con respuestas y sin desviaciones registradas. No se asigna conformidad a inspecciones abiertas o incompletas.';
const fallo = (mensaje, status = 422) => Object.assign(new Error(mensaje), { status });
const leer = (sql, replacements = {}, transaction) =>
  sequelize.query(sql, { replacements, transaction, type: QueryTypes.SELECT });

function validar(query) {
  const filtros = {};
  for (const campo of ['fechaInicio', 'fechaFin']) {
    const fecha = query[campo];
    if (
      typeof fecha !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
      Number.isNaN(Date.parse(fecha)) ||
      new Date(`${fecha}T00:00:00Z`).toISOString().slice(0, 10) !== fecha
    ) {
      throw fallo('Indica una fecha de inicio y una fecha fin válidas');
    }
    filtros[campo] = fecha;
  }
  if (filtros.fechaInicio > filtros.fechaFin)
    throw fallo('La fecha inicio no puede ser posterior a la fecha fin');
  for (const campo of ['tipoId', 'formatoId', 'lugarId', 'productoId', 'ordenId']) {
    const valor = query[campo] || null;
    if (
      valor !== null &&
      (typeof valor !== 'string' || !/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(valor))
    ) {
      throw fallo('Filtro de catálogo inválido');
    }
    filtros[campo] = valor;
  }
  filtros.estado = query.estado || null;
  filtros.estadoAccion = query.estadoAccion || null;
  if (filtros.estado && !ESTADOS.includes(filtros.estado))
    throw fallo('Estado de inspección inválido');
  if (filtros.estadoAccion && !ESTADOS_ACCION.includes(filtros.estadoAccion))
    throw fallo('Estado de acción inválido');
  for (const campo of ['soloDesviaciones', 'soloAcciones']) {
    if (query[campo] !== undefined && ![true, false, 'true', 'false', ''].includes(query[campo]))
      throw fallo('Filtro booleano inválido');
    filtros[campo] = query[campo] === true || query[campo] === 'true';
  }
  const pagina = Number(query.pagina || 1);
  const limite = Number(query.limite || 20);
  if (
    !Number.isSafeInteger(pagina) ||
    pagina < 1 ||
    pagina > 100000 ||
    !Number.isInteger(limite) ||
    limite < 1 ||
    limite > 100
  ) {
    throw fallo('Paginación inválida');
  }
  return { filtros, pagina, limite };
}

async function catalogos(transaction) {
  const filas = await leer(
    `
    SELECT 'tipos' AS grupo, id, nombre AS etiqueta, NULL::uuid AS formato_tipo FROM tipos_inspeccion
    UNION ALL SELECT 'formatos', id, codigo || ' - ' || nombre, tipo_inspeccion_id FROM formatos_calidad
    UNION ALL SELECT 'lugares', id, nombre, NULL::uuid FROM lugares_inspeccion
    UNION ALL SELECT DISTINCT 'productos', p.id, p.codigo || ' - ' || p.nombre, NULL::uuid
      FROM productos p JOIN inspecciones i ON i.producto_id = p.id
    UNION ALL SELECT DISTINCT 'ordenes', o.id, o.numero, NULL::uuid
      FROM ordenes_produccion o JOIN inspecciones i ON i.orden_produccion_id = o.id
    ORDER BY etiqueta
  `,
    {},
    transaction,
  );
  const data = {
    tipos: [],
    formatos: [],
    lugares: [],
    productos: [],
    ordenes: [],
    estados: ESTADOS,
    estadosAccion: ESTADOS_ACCION,
  };
  for (const { grupo, id, etiqueta, formato_tipo } of filas)
    data[grupo].push({ id, etiqueta, tipoId: formato_tipo });
  return data;
}

async function resumen(filtros, transaction) {
  const [fila] = await leer(
    `WITH seleccion AS (${SQL.BASE}),
    acciones AS (
      SELECT a.* FROM acciones_correctivas a JOIN desviaciones d ON d.id = a.desviacion_id
      JOIN seleccion i ON i.id = d.inspeccion_id
    )
    SELECT count(*)::int AS inspecciones,
      count(*) FILTER (WHERE s.estado = 'CERRADA' AND s.desviaciones = 0 AND (
        EXISTS (SELECT 1 FROM respuestas_inspeccion r WHERE r.inspeccion_id = s.id)
        OR EXISTS (SELECT 1 FROM respuestas_elemento_checklist r WHERE r.inspeccion_id = s.id)
      ))::int AS conformes,
      count(*) FILTER (WHERE s.desviaciones > 0)::int AS con_desviacion,
      COALESCE(sum(s.desviaciones), 0)::int AS desviaciones,
      (SELECT count(*)::int FROM acciones) AS acciones_correctivas,
      (SELECT count(*)::int FROM acciones WHERE estado IN ('PENDIENTE', 'EN_PROCESO')) AS acciones_abiertas,
      (SELECT count(*)::int FROM acciones WHERE estado = 'PENDIENTE_APROBACION') AS pendientes_aprobacion,
      (SELECT count(*)::int FROM acciones WHERE estado = 'CERRADA') AS acciones_cerradas
    FROM seleccion s`,
    filtros,
    transaction,
  );
  return fila;
}

function agrupar(filas, campo) {
  const mapa = new Map();
  for (const fila of filas) {
    const clave = fila[campo];
    const datos = { ...fila };
    delete datos[campo];
    if (!mapa.has(clave)) mapa.set(clave, []);
    mapa.get(clave).push(datos);
  }
  return mapa;
}

function valorRespuesta(r) {
  if (r.opciones?.length) return r.opciones;
  for (const clave of [
    'valor_numero',
    'valor_booleano',
    'valor_fecha',
    'valor_hora',
    'valor_fecha_hora',
    'valor_json',
    'valor_texto',
  ]) {
    if (r[clave] !== null && r[clave] !== undefined) return r[clave];
  }
  return null;
}

async function detallar(filas, transaction) {
  if (!filas.length) return [];
  const ids = filas.map((fila) => fila.id);
  // Ocho consultas por lote, independientemente de cuántas inspecciones incluya.
  const conjuntos = [];
  for (const sql of [
    SQL.RESPUESTAS,
    SQL.CHECKLISTS,
    SQL.DESVIACIONES,
    SQL.ACCIONES,
    SQL.CAMPOS,
    SQL.SEGUIMIENTOS,
    SQL.EVIDENCIAS,
    SQL.TAREAS,
  ])
    conjuntos.push(await leer(sql, { ids }, transaction));
  const [campos, checklists, desv, acciones, dinamicos, seguimientos, evidencias, tareas] =
    conjuntos;
  const respuestas = campos
    .map((r) => ({
      id: r.id,
      inspeccion_id: r.inspeccion_id,
      origen: r.origen,
      seccion: r.seccion,
      campo: r.campo,
      parametro: r.parametro,
      tipo: r.tipo,
      valor: valorRespuesta(r),
      unidad: r.unidad,
      valor_minimo: r.valor_minimo,
      valor_maximo: r.valor_maximo,
      es_calculado: r.es_calculado,
      valor_calculado: r.es_calculado ? valorRespuesta(r) : null,
      observacion: r.observacion,
      fecha_guardado: r.fecha_guardado,
    }))
    .filter((r) => r.valor !== null || r.observacion)
    .concat(checklists);
  const respuestasPorId = new Map(respuestas.map((r) => [r.id, r]));
  const desviaciones = desv.map((d) => {
    const { respuesta_inspeccion_id, respuesta_elemento_checklist_id, ...datos } = d;
    const r = respuestasPorId.get(respuesta_inspeccion_id || respuesta_elemento_checklist_id);
    return {
      ...datos,
      origen: r?.campo || r?.elemento || d.criterio || null,
      parametro: r?.parametro || r?.criterio || null,
      valor_obtenido: r?.valor ?? r?.resultado ?? null,
      valor_minimo: r?.valor_minimo ?? null,
      valor_maximo: r?.valor_maximo ?? null,
      unidad: r?.unidad ?? null,
      observacion_respuesta: r?.observacion ?? null,
      evidencia: r?.evidencia ?? null,
    };
  });
  const porDesviacion = new Map(desviaciones.map((d) => [d.id, d]));
  const camposAccion = agrupar(dinamicos, 'accion_correctiva_id');
  const seguimientoAccion = agrupar(seguimientos, 'accion_correctiva_id');
  const evidenciaAccion = agrupar(evidencias, 'accion_correctiva_id');
  const tareaAccion = agrupar(tareas, 'accion_correctiva_id');
  const contextoInspeccion = new Map(filas.map((fila) => [fila.id, fila]));
  const accionesDto = acciones.map((a) => {
    const { desviacion_id, ...datos } = a;
    const origen = porDesviacion.get(desviacion_id);
    const contextoOrigen = { ...origen };
    delete contextoOrigen.id;
    delete contextoOrigen.inspeccion_id;
    const contexto = contextoInspeccion.get(a.inspeccion_id);
    const contextoDocumentado = Object.fromEntries(
      [
        'tipo_inspeccion',
        'formato',
        'version',
        'lugar',
        'ot',
        'codigo_producto',
        'producto',
        'lote',
        'fecha_vencimiento',
      ]
        .filter((clave) => contexto[clave] !== null && contexto[clave] !== undefined)
        .map((clave) => [clave, contexto[clave]]),
    );
    return {
      ...datos,
      origen: contextoOrigen,
      contexto_origen: contextoDocumentado,
      campos: camposAccion.get(a.id) || [],
      seguimientos: seguimientoAccion.get(a.id) || [],
      evidencias: evidenciaAccion.get(a.id) || [],
      tareas: tareaAccion.get(a.id) || [],
    };
  });
  const porInspeccion = [respuestas, desviaciones, accionesDto].map((datos) =>
    agrupar(datos, 'inspeccion_id'),
  );
  return filas.map(
    ({ id, desviaciones: cantidadDesviaciones, acciones: cantidadAcciones, ...contexto }) => ({
      id,
      contexto,
      cantidadDesviaciones,
      cantidadAcciones,
      respuestas: porInspeccion[0].get(id) || [],
      desviaciones: porInspeccion[1].get(id) || [],
      acciones: porInspeccion[2].get(id) || [],
    }),
  );
}

async function pagina(filtros, numero, limite, transaction) {
  const filas = await leer(
    `${SQL.BASE} ORDER BY i.fecha_inicio DESC, i.id LIMIT :limite OFFSET :offset`,
    { ...filtros, limite, offset: (numero - 1) * limite },
    transaction,
  );
  return detallar(filas, transaction);
}

async function criteriosLegibles(filtros, transaction) {
  const opciones = await catalogos(transaction);
  const etiquetas = {
    tipoId: ['tipos', 'Tipo de inspección'],
    formatoId: ['formatos', 'Formato'],
    lugarId: ['lugares', 'Lugar'],
    productoId: ['productos', 'Producto'],
    ordenId: ['ordenes', 'OT'],
  };
  const criterios = {
    'Fecha inicio': filtros.fechaInicio,
    'Fecha fin': filtros.fechaFin,
    'Zona horaria': 'America/Bogota',
    'Fecha utilizada': 'Inicio real de la inspección',
  };
  for (const [campo, [grupo, etiqueta]] of Object.entries(etiquetas)) {
    if (filtros[campo])
      criterios[etiqueta] =
        opciones[grupo].find((o) => o.id === filtros[campo])?.etiqueta ||
        'Sin información relacionada';
  }
  if (filtros.estado) criterios['Estado inspección'] = filtros.estado;
  if (filtros.estadoAccion) criterios['Estado acción'] = filtros.estadoAccion;
  if (filtros.soloDesviaciones) criterios['Solo con desviaciones'] = 'Sí';
  if (filtros.soloAcciones) criterios['Solo con acciones correctivas'] = 'Sí';
  return criterios;
}

async function consultar(query) {
  const { filtros, pagina: numero, limite } = validar(query);
  return sequelize.transaction(
    { isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ, readOnly: true },
    async (transaction) => {
      const kpis = await resumen(filtros, transaction);
      return {
        filtros,
        criterios: await criteriosLegibles(filtros, transaction),
        resumen: kpis,
        reglaConformes: REGLA_CONFORMES,
        alcanceAcciones:
          'Se muestran todas las acciones de las inspecciones seleccionadas, incluidas las cerradas.',
        pagina: numero,
        limite,
        total: kpis.inspecciones,
        inspecciones: await pagina(filtros, numero, limite, transaction),
      };
    },
  );
}

async function recorrerCompleto(query, procesar) {
  const { filtros } = validar(query);
  return sequelize.transaction(
    { isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ, readOnly: true },
    async (transaction) => {
      const kpis = await resumen(filtros, transaction);
      if (!kpis.inspecciones)
        throw fallo('No hay inspecciones para exportar con ese rango y filtros', 404);
      const metadata = {
        criterios: await criteriosLegibles(filtros, transaction),
        resumen: kpis,
        reglaConformes: REGLA_CONFORMES,
      };
      async function* lotes() {
        for (let numero = 1; (numero - 1) * 50 < kpis.inspecciones; numero++)
          yield await pagina(filtros, numero, 50, transaction);
      }
      return procesar(metadata, lotes());
    },
  );
}

module.exports = { catalogos, consultar, recorrerCompleto };
