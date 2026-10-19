const { QueryTypes, Transaction } = require('sequelize');
const { sequelize } = require('../../models');
const contexto = require('./trazabilidad-contexto');

const TIPOS = ['pedido', 'despacho', 'ot', 'pt', 'mp', 'recepcion'];
const CONSULTAS = {
  recepcion: `
    SELECT d.id, rc.numero AS recepcion, rc.fecha_recepcion AS fecha,
      COALESCE(pv.razon_social, pv.nombre_comercial) AS proveedor,
      p.codigo AS producto_codigo, p.nombre AS producto, d.lote_proveedor,
      mi.lote, d.cantidad_recibida, u.simbolo AS unidad, d.fecha_vencimiento,
      b.nombre AS bodega, rc.estado, rr.resultado, rr.observaciones,
      vr.certificado_calidad, vr.plagas, vr.rotulado_correcto, vr.condiciones_embalaje,
      vr.apariencia_color_textura, vr.empaque_embalaje, vr.olor,
      (SELECT string_agg(t.temperatura::text || ' °C', ', ' ORDER BY t.hora)
       FROM temperaturas_recepcion t WHERE t.detalle_recepcion_id = d.id) AS temperaturas
    FROM recepciones_rel rc
    JOIN detalles_recepcion d ON d.recepcion_id = rc.id
    JOIN productos p ON p.id = d.producto_id
    LEFT JOIN unidades_medida u ON u.id = d.unidad_medida_id
    JOIN proveedores pv ON pv.id = rc.proveedor_id
    LEFT JOIN bodegas b ON b.id = rc.bodega_id
    LEFT JOIN resultados_recepcion rr ON rr.recepcion_id = rc.id
    LEFT JOIN verificaciones_recepcion vr ON vr.recepcion_id = rc.id
    LEFT JOIN LATERAL (
      SELECT DISTINCT dm.lote FROM detalle_movimiento dm
      JOIN movimientos_inventario m ON m.id = dm.movimiento_inventario_id
      WHERE m.origen = 'RECEPCION' AND m.origen_id = rc.id
        AND dm.producto_id = d.producto_id AND dm.lote_proveedor IS NOT DISTINCT FROM d.lote_proveedor
    ) mi ON true
    WHERE EXISTS (SELECT 1 FROM pares pr WHERE pr.producto_id = d.producto_id AND pr.lote = mi.lote)
       OR EXISTS (SELECT 1 FROM raiz r WHERE r.tipo = 'recepcion' AND r.valor = rc.numero)
    ORDER BY rc.fecha_recepcion, rc.numero, d.id`,
  inventario: `
    SELECT d.id, d.tipo_documento, d.numero_documento AS documento, d.fecha,
      p.codigo AS producto_codigo, p.nombre AS producto, d.lote, d.cantidad,
      u.simbolo AS unidad, d.sentido, b.nombre AS bodega, d.estado, d.origen,
      COALESCE(o.numero, rc.numero, po.numero) AS referencia_origen
    FROM inventario_rel d JOIN productos p ON p.id = d.producto_id
    LEFT JOIN unidades_medida u ON u.id = d.unidad_medida_id
    LEFT JOIN bodegas b ON b.id = d.bodega_id
    LEFT JOIN movimientos_ot v ON v.movimiento_id = d.movimiento_inventario_id
    LEFT JOIN ordenes o ON o.id = v.orden_id
    LEFT JOIN recepciones rc ON d.origen = 'RECEPCION' AND rc.id = d.origen_id
    LEFT JOIN despachos_rel ds ON ds.movimiento_id = d.movimiento_inventario_id AND ds.detalle_id IN
      (SELECT id FROM pedido_venta_detalle WHERE producto_id = d.producto_id)
      AND ds.lote IS NOT DISTINCT FROM d.lote
    LEFT JOIN pedidos_rel po ON po.id = ds.pedido_venta_id
    ORDER BY d.fecha, d.numero_documento, d.id`,
  produccion: `
    SELECT o.id, o.numero AS ot, o.estado, o.fecha, o.fecha_inicio, o.fecha_finalizacion,
      p.codigo AS producto_codigo, p.nombre AS producto, COALESCE(r.cantidad_planeada, od.cantidad) AS cantidad_planeada,
      r.cantidad_producida, u.simbolo AS unidad, r.lote_pt AS lote,
      r.fecha_vencimiento_final AS fecha_vencimiento, b.nombre AS bodega
    FROM ordenes o LEFT JOIN ordenes_produccion_detalle od ON od.orden_produccion_id = o.id
    LEFT JOIN resultados_produccion r ON r.orden_produccion_id = o.id AND r.producto_terminado_id = od.producto_terminado_id
    LEFT JOIN productos p ON p.id = COALESCE(r.producto_terminado_id, od.producto_terminado_id)
    LEFT JOIN unidades_medida u ON u.id = COALESCE(r.unidad_medida_id, p.unidad_medida_id)
    LEFT JOIN bodegas b ON b.id = r.bodega_destino_id
    ORDER BY o.numero, p.codigo`,
  parciales: `
    SELECT r.id, o.numero AS ot, p.codigo AS producto_codigo, p.nombre AS producto,
      r.lote, r.cantidad, u.simbolo AS unidad, r.fecha, us.nombre AS usuario,
      sa.numero_documento AS salida_pep, en.numero_documento AS entrada_pt
    FROM reportes_produccion r JOIN ordenes o ON o.id = r.orden_produccion_id
    JOIN productos p ON p.id = r.producto_terminado_id
    LEFT JOIN unidades_medida u ON u.id = r.unidad_medida_id
    LEFT JOIN usuarios us ON us.id = r.usuario_id
    LEFT JOIN movimientos_inventario sa ON sa.id = r.movimiento_salida_id
    LEFT JOIN movimientos_inventario en ON en.id = r.movimiento_entrada_id
    ORDER BY r.fecha, r.id`,
  materiasPrimas: `
    SELECT d.id, o.numero AS ot, p.codigo AS producto_codigo, p.nombre AS producto,
      d.lote, v.etapa, d.cantidad, u.simbolo AS unidad, d.sentido, b.nombre AS bodega,
      m.numero_documento AS documento, m.fecha
    FROM movimientos_ot v JOIN ordenes o ON o.id = v.orden_id
    JOIN movimientos_inventario m ON m.id = v.movimiento_id
    JOIN detalle_movimiento d ON d.movimiento_inventario_id = m.id
    JOIN productos p ON p.id = d.producto_id AND p.tipo_producto <> 'PT'
    LEFT JOIN unidades_medida u ON u.id = d.unidad_medida_id
    LEFT JOIN bodegas b ON b.id = m.bodega_id
    ORDER BY o.numero, m.fecha, d.id`,
  solicitudes: `
    SELECT s.id, o.numero AS ot, s.tipo, p.codigo AS producto_codigo, p.nombre AS producto,
      s.lote, s.cantidad, u.simbolo AS unidad, s.motivo, s.estado,
      us.nombre AS solicitante, ua.nombre AS aprobador, s.fecha_solicitud AS fecha,
      s.fecha_aprobacion, bo.nombre AS bodega_origen, bd.nombre AS bodega_destino,
      s.observacion_resolucion AS observacion
    FROM solicitudes_movimiento_ot s JOIN ordenes o ON o.id = s.orden_produccion_id
    JOIN productos p ON p.id = s.producto_id
    LEFT JOIN unidades_medida u ON u.id = s.unidad_medida_id
    LEFT JOIN usuarios us ON us.id = s.usuario_solicita_id
    LEFT JOIN usuarios ua ON ua.id = s.usuario_aprueba_id
    LEFT JOIN bodegas bo ON bo.id = s.bodega_origen_id
    LEFT JOIN bodegas bd ON bd.id = s.bodega_destino_id
    ORDER BY s.fecha_solicitud, s.id`,
  mermas: `
    SELECT m.id, o.numero AS ot, m.tipo_merma AS tipo, p.codigo AS producto_codigo,
      p.nombre AS producto, m.cantidad, u.simbolo AS unidad, mm.nombre AS motivo,
      m.observacion, us.nombre AS usuario, m.fecha
    FROM mermas_produccion m JOIN ordenes o ON o.id = m.orden_produccion_id
    JOIN productos p ON p.id = m.producto_id
    LEFT JOIN unidades_medida u ON u.id = m.unidad_medida_id
    LEFT JOIN motivos_merma mm ON mm.id = m.motivo_merma_id
    LEFT JOIN usuarios us ON us.id = m.usuario_id
    ORDER BY m.fecha, m.id`,
  calidad: `
    SELECT i.id, f.codigo AS formato, f.nombre AS nombre_formato, vf.numero_version AS version,
      i.fecha_inspeccion AS fecha, us.nombre AS responsable, i.estado, i.observaciones,
      o.numero AS ot, p.codigo AS producto_codigo, p.nombre AS producto, i.lote,
      (SELECT string_agg(COALESCE(d.descripcion, d.mensaje, d.estado::text), '; ' ORDER BY d.fecha_deteccion)
       FROM desviaciones d WHERE d.inspeccion_id = i.id) AS resultado,
      (SELECT string_agg(COALESCE(a.descripcion, '') || ' [' || a.estado || ']', '; ' ORDER BY a.fecha_asignacion)
       FROM acciones_correctivas a JOIN desviaciones d ON d.id = a.desviacion_id
       WHERE d.inspeccion_id = i.id) AS acciones_correctivas
    FROM inspecciones_rel i JOIN versiones_formato vf ON vf.id = i.version_formato_id
    JOIN formatos_calidad f ON f.id = vf.formato_calidad_id
    LEFT JOIN usuarios us ON us.id = i.iniciada_por
    LEFT JOIN ordenes_produccion o ON o.id = i.orden_produccion_id
    LEFT JOIN productos p ON p.id = i.producto_id
    ORDER BY i.fecha_inspeccion, i.id`,
  ventas: `
    SELECT d.id, pv.numero AS pedido, COALESCE(c.razon_social, c.nombre_comercial) AS cliente,
      pv.fecha, pv.estado, p.codigo AS producto_codigo, p.nombre AS producto,
      d.cantidad, u.simbolo AS unidad
    FROM pedidos_rel pv JOIN pedido_venta_detalle d ON d.pedido_venta_id = pv.id
    JOIN productos p ON p.id = d.producto_id JOIN proveedores c ON c.id = pv.cliente_id
    LEFT JOIN unidades_medida u ON u.id = d.unidad_medida_id
    WHERE d.id IN (SELECT detalle_id FROM despachos_rel)
       OR EXISTS (SELECT 1 FROM raiz r WHERE r.tipo = 'pedido' AND pv.numero = r.valor)
    ORDER BY pv.fecha, pv.numero, d.id`,
  despachos: `
    SELECT ds.detalle_id AS id, m.numero_documento AS despacho, ds.fecha,
      pv.numero AS pedido, COALESCE(c.razon_social, c.nombre_comercial) AS cliente,
      p.codigo AS producto_codigo, p.nombre AS producto, ds.lote, ds.cantidad,
      u.simbolo AS unidad, b.nombre AS bodega, m.numero_documento AS movimiento_sa,
      NULL::text AS vehiculo
    FROM despachos_rel ds JOIN pedidos_venta pv ON pv.id = ds.pedido_venta_id
    JOIN pedido_venta_detalle d ON d.id = ds.detalle_id
    JOIN proveedores c ON c.id = pv.cliente_id JOIN productos p ON p.id = ds.producto_id
    LEFT JOIN unidades_medida u ON u.id = d.unidad_medida_id
    LEFT JOIN movimientos_inventario m ON m.id = ds.movimiento_id
    LEFT JOIN bodegas b ON b.id = ds.bodega_id
    ORDER BY ds.fecha, m.numero_documento, ds.detalle_id, ds.lote`,
  cronologia: `
    SELECT rc.id::text AS id, rc.fecha_recepcion AS fecha, 'Recepción' AS evento,
      rc.numero AS referencia FROM recepciones_rel rc
    UNION ALL
    SELECT m.id::text, m.fecha, CASE WHEN v.etapa = 'INICIAL' THEN 'Salida MP'
      WHEN v.etapa = 'INGRESO_PEP' THEN 'Ingreso PEP'
      WHEN v.etapa = 'CONSUMO_PEP' THEN 'Consumo PEP'
      WHEN v.etapa = 'ENTRADA_PT' THEN 'Entrada PT' ELSE v.etapa END, m.numero_documento
    FROM movimientos_ot v JOIN movimientos_inventario m ON m.id = v.movimiento_id
    UNION ALL
    SELECT id::text || '-inicio', fecha_inicio, 'Inicio producción', numero
    FROM ordenes WHERE fecha_inicio IS NOT NULL
    UNION ALL
    SELECT id::text || '-fin', fecha_finalizacion, 'Finalización producción', numero
    FROM ordenes WHERE fecha_finalizacion IS NOT NULL
    UNION ALL
    SELECT id::text, fecha, 'Parcial producción', lote FROM reportes_produccion
    WHERE orden_produccion_id IN (SELECT id FROM ordenes)
    UNION ALL
    SELECT i.id::text, i.fecha_inicio, 'Calidad', f.codigo FROM inspecciones_rel i
    JOIN versiones_formato vf ON vf.id = i.version_formato_id
    JOIN formatos_calidad f ON f.id = vf.formato_calidad_id
    UNION ALL
    SELECT id::text, fecha, 'Pedido', numero FROM pedidos_rel
    UNION ALL
    SELECT DISTINCT ds.movimiento_id::text, ds.fecha, 'Despacho', m.numero_documento
    FROM despachos_rel ds JOIN movimientos_inventario m ON m.id = ds.movimiento_id
    ORDER BY fecha, id`,
};

function parametros(query) {
  const tipo = query.tipo;
  if (!TIPOS.includes(tipo))
    throw Object.assign(new Error('Tipo de búsqueda inválido'), { status: 422 });
  const producto = String(query.producto || '').trim();
  const lote = String(query.lote || '').trim();
  const valor = String(query.valor || '').trim();
  if (['pt', 'mp'].includes(tipo) ? !producto || !lote : !valor) {
    throw Object.assign(new Error('Complete los criterios de búsqueda'), { status: 422 });
  }
  if (producto.length > 50 || lote.length > 100 || valor.length > 100) {
    throw Object.assign(new Error('Criterios demasiado largos'), { status: 422 });
  }
  return { tipo, producto, lote, valor };
}

async function origen(r, transaction) {
  const opciones = { replacements: r, type: QueryTypes.SELECT, transaction };
  let sql;
  if (['mp', 'pt'].includes(r.tipo)) {
    sql = `SELECT p.codigo, p.nombre, :lote AS lote, p.tipo_producto
      FROM productos p WHERE p.codigo = :producto
        AND ${r.tipo === 'pt' ? "p.tipo_producto = 'PT'" : "p.tipo_producto <> 'PT'"}
        AND (EXISTS (SELECT 1 FROM detalle_movimiento d WHERE d.producto_id = p.id AND d.lote = :lote)
          OR EXISTS (SELECT 1 FROM resultados_produccion rp WHERE rp.producto_terminado_id = p.id AND rp.lote_pt = :lote))`;
  } else {
    const fuentes = {
      pedido: `SELECT p.numero AS codigo, p.fecha, p.estado,
        COALESCE(c.razon_social, c.nombre_comercial) AS cliente
        FROM pedidos_venta p JOIN proveedores c ON c.id = p.cliente_id WHERE p.numero = :valor`,
      despacho: `SELECT numero_documento AS codigo, fecha, estado FROM movimientos_inventario
        WHERE numero_documento = :valor AND origen = 'PEDIDO_VENTA' AND tipo_documento = 'SA'`,
      ot: 'SELECT numero AS codigo, fecha, estado FROM ordenes_produccion WHERE numero = :valor',
      recepcion: `SELECT r.numero AS codigo, r.fecha_recepcion AS fecha, r.estado,
        COALESCE(p.razon_social, p.nombre_comercial) AS proveedor
        FROM recepciones r JOIN proveedores p ON p.id = r.proveedor_id WHERE r.numero = :valor`,
    };
    sql = fuentes[r.tipo];
  }
  const [fila] = await sequelize.query(sql, opciones);
  if (!fila)
    throw Object.assign(new Error('No se encontró la entidad o el lote indicado'), { status: 404 });
  return { tipo: r.tipo, ...fila };
}

async function consultar(query) {
  const r = parametros(query);
  const bloque = query.bloque;
  if (bloque && !Object.hasOwn(CONSULTAS, bloque)) {
    throw Object.assign(new Error('Bloque inválido'), { status: 422 });
  }
  const pagina = Number(query.pagina || 1);
  if (!Number.isSafeInteger(pagina) || pagina < 1 || pagina > 100000) {
    throw Object.assign(new Error('Página inválida'), { status: 422 });
  }
  // Una vista consistente por respuesta; sólo SELECT, nunca bloqueos operativos.
  return sequelize.transaction(
    { isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ, readOnly: true },
    async (transaction) => {
      const resumen = await origen(r, transaction);
      const dto = { origen: resumen, bloques: Object.keys(CONSULTAS) };
      for (const nombre of Object.keys(CONSULTAS)) dto[nombre] = null;
      if (bloque) {
        const filas = await sequelize.query(
          `${contexto}\nSELECT * FROM (${CONSULTAS[bloque]}) bloque LIMIT 101 OFFSET :offset`,
          {
            replacements: { ...r, offset: (pagina - 1) * 100 },
            type: QueryTypes.SELECT,
            transaction,
          },
        );
        dto[bloque] = { filas: filas.slice(0, 100), pagina, hayMas: filas.length > 100 };
      }
      return dto;
    },
  );
}

async function buscar(query) {
  if (!TIPOS.includes(query.tipo)) throw Object.assign(new Error('Tipo inválido'), { status: 422 });
  const q = String(query.q || '').trim();
  if (q.length > 100) throw Object.assign(new Error('Búsqueda demasiado larga'), { status: 422 });
  const like = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
  let sql;
  if (['mp', 'pt'].includes(query.tipo)) {
    if (query.producto) {
      sql = `SELECT registros.valor, registros.valor AS etiqueta, MIN(registros.fecha) AS fecha
        FROM (
        SELECT d.lote AS valor, m.fecha
        FROM detalle_movimiento d JOIN productos p ON p.id = d.producto_id
        JOIN movimientos_inventario m ON m.id = d.movimiento_inventario_id
        WHERE p.codigo = :producto AND d.lote IS NOT NULL AND d.lote ILIKE :like
          AND ${query.tipo === 'pt' ? "p.tipo_producto = 'PT'" : "p.tipo_producto <> 'PT'"}
        ${
          query.tipo === 'pt'
            ? `UNION ALL
          SELECT rp.lote_pt, rp.created_at FROM resultados_produccion rp
          JOIN productos p ON p.id = rp.producto_terminado_id
          WHERE p.codigo = :producto AND p.tipo_producto = 'PT'
            AND rp.lote_pt IS NOT NULL AND rp.lote_pt ILIKE :like`
            : ''
        }
        ) registros
        GROUP BY registros.valor
        ORDER BY registros.valor LIMIT 30`;
    } else {
      sql = `SELECT codigo AS valor, codigo || ' · ' || nombre AS etiqueta FROM productos
        WHERE ${query.tipo === 'pt' ? "tipo_producto = 'PT'" : "tipo_producto <> 'PT'"}
          AND (codigo ILIKE :like OR nombre ILIKE :like) ORDER BY codigo LIMIT 30`;
    }
  } else {
    const fuentes = {
      pedido:
        'SELECT numero AS valor, numero AS etiqueta, fecha FROM pedidos_venta WHERE numero ILIKE :like',
      ot: 'SELECT numero AS valor, numero AS etiqueta, fecha FROM ordenes_produccion WHERE numero ILIKE :like',
      recepcion:
        'SELECT numero AS valor, numero AS etiqueta, fecha_recepcion AS fecha FROM recepciones WHERE numero ILIKE :like',
      despacho: `SELECT numero_documento AS valor, numero_documento AS etiqueta, fecha
        FROM movimientos_inventario WHERE origen = 'PEDIDO_VENTA' AND tipo_documento = 'SA'
        AND numero_documento ILIKE :like`,
    };
    sql = `${fuentes[query.tipo]} ORDER BY valor LIMIT 30`;
  }
  const resultados = await sequelize.query(sql, {
    replacements: { like, producto: String(query.producto || '') },
    type: QueryTypes.SELECT,
  });
  const incluirFecha = Boolean(query.producto) || !['mp', 'pt'].includes(query.tipo);
  if (!incluirFecha) return resultados;

  const formatoFecha = new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Bogota',
  });
  return resultados.map(({ valor, etiqueta, fecha }) => {
    // Las fechas sin hora (OT) conservan su día calendario al formatearse.
    const fechaLocal =
      typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? `${fecha}T12:00:00Z` : fecha;
    const fechaDocumento = fechaLocal ? new Date(fechaLocal) : null;
    const textoFecha =
      fechaDocumento && !Number.isNaN(fechaDocumento.getTime())
        ? formatoFecha.format(fechaDocumento)
        : 'Sin fecha registrada';
    return { valor, etiqueta: `${etiqueta} - ${textoFecha}` };
  });
}

module.exports = { buscar, consultar };
