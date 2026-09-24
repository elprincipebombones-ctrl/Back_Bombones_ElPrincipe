const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../models');
const error = (message) => Object.assign(new Error(message), { status: 422 });
function periodo(desde, hasta) {
  const parse = (value) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
      throw error('Fechas requeridas en formato YYYY-MM-DD');
    const date = new Date(value + 'T00:00:00Z');
    if (!Number.isFinite(+date) || date.toISOString().slice(0, 10) !== value)
      throw error('Fecha inválida');
    return date;
  };
  const dias = (+parse(hasta) - +parse(desde)) / 86400000 + 1;
  if (dias <= 0) throw error('fechaDesde debe ser menor o igual a fechaHasta');
  return { dias, meses: dias / 30 };
}
const base = `WITH movimientos AS (
  SELECT d.*, m.fecha, m.tipo_documento, m.numero_documento, m.bodega_id,
    m.origen, m.origen_id, m.usuario_id, m.observaciones AS observaciones_movimiento,
    CASE WHEN m.tipo_documento IN ('EN','AJN','TRN') THEN 'ENTRADA' WHEN m.tipo_documento IN ('SA','AJS','TRS') THEN 'SALIDA' ELSE d.sentido END AS direccion
  FROM detalle_movimiento d JOIN movimientos_inventario m ON m.id=d.movimiento_inventario_id
  WHERE m.estado='APLICADO' AND (:bodegaId::uuid IS NULL OR m.bodega_id=:bodegaId::uuid)
), productos_filtrados AS (
  SELECT p.*, c.nombre AS categoria, c.clasificacion_mp
  FROM productos p JOIN categorias_productos c ON c.id=p.categoria_producto_id
  WHERE (:productoId::uuid IS NULL OR p.id=:productoId::uuid)
    AND (:categoriaProductoId::uuid IS NULL OR c.id=:categoriaProductoId::uuid)
    AND (:codigo::text IS NULL OR p.codigo ILIKE :codigo)
), datos AS (`;
const enPeriodo = `m.fecha >= (:fechaDesde::date::timestamp AT TIME ZONE 'America/Bogota') AND m.fecha < ((:fechaHasta::date + 1)::timestamp AT TIME ZONE 'America/Bogota')`;
const columnas = `p.id AS "productoId", p.codigo, p.nombre, p.descripcion, p.categoria,
  NULL::text AS "tipoProducto", p.clasificacion_mp AS clasificacion`;
function metricas(row, meses) {
  for (const key of [
    'entradas',
    'salidas',
    'saldoConocido',
    'frecuencia',
    'movimientosSinSentido',
    'cantidad',
  ]) {
    if (row[key] !== undefined) row[key] = Number(row[key]);
  }
  if (row.salidas !== undefined) {
    row.movimientoNeto = row.entradas - row.salidas;
    row.promedioMensual = Number((row.salidas / meses).toFixed(3));
    row.stockSeguridad = Number((row.salidas / meses / 0.5).toFixed(3));
    row.inventarioDisponible = row.movimientosSinSentido ? null : row.saldoConocido;
  }
  return row;
}
async function informe(query, detalle = false, exportar = false) {
  if (query.tipoProducto)
    throw Object.assign(
      new Error('Filtro MP/PT pendiente de integrar el maestro de productos existente'),
      { status: 409 },
    );
  const { dias, meses } = periodo(query.fechaDesde, query.fechaHasta);
  const pagina = Number(query.pagina || 1),
    limite = Number(query.limite || 50);
  const replacements = {
    fechaDesde: query.fechaDesde,
    fechaHasta: query.fechaHasta,
    bodegaId: query.bodegaId || null,
    productoId: query.productoId || null,
    categoriaProductoId: query.categoriaProductoId || null,
    tipoProducto: query.tipoProducto || null,
    codigo: query.codigo ? `%${query.codigo}%` : null,
    limit: exportar ? 10001 : limite,
    offset: exportar ? 0 : (pagina - 1) * limite,
  };
  const resumen = `SELECT ${columnas}, u.id AS "unidadMedidaId", u.simbolo AS unidad,
    COALESCE(SUM(m.cantidad) FILTER (WHERE m.direccion='ENTRADA' AND ${enPeriodo}),0) AS entradas,
    COALESCE(SUM(m.cantidad) FILTER (WHERE m.direccion='SALIDA' AND ${enPeriodo}),0) AS salidas,
    COUNT(DISTINCT m.movimiento_inventario_id) FILTER (WHERE m.direccion='SALIDA' AND ${enPeriodo}) AS frecuencia,
    COALESCE(SUM(CASE WHEN m.direccion='ENTRADA' THEN m.cantidad WHEN m.direccion='SALIDA' THEN -m.cantidad ELSE 0 END),0) AS "saldoConocido",
    COUNT(m.id) FILTER (WHERE m.direccion IS NULL) AS "movimientosSinSentido"
    FROM productos_filtrados p LEFT JOIN movimientos m ON m.producto_id=p.id AND m.fecha<=CURRENT_TIMESTAMP
    JOIN unidades_medida u ON u.id=COALESCE(m.unidad_medida_id,p.unidad_medida_id)
    GROUP BY p.id,p.codigo,p.nombre,p.descripcion,p.categoria,p.clasificacion_mp,u.id,u.simbolo`;
  const filas = `SELECT ${columnas}, m.id AS "detalleId", m.movimiento_inventario_id AS "movimientoInventarioId",
    m.fecha, m.tipo_documento AS "tipoDocumento",m.numero_documento AS "numeroDocumento",
    m.bodega_id AS "bodegaId",b.nombre AS bodega,m.direccion AS sentido,m.cantidad,
    m.unidad_medida_id AS "unidadMedidaId",u.simbolo AS unidad,m.lote,m.lote_proveedor AS "loteProveedor",
    m.fecha_vencimiento AS "fechaVencimiento",m.origen,m.origen_id AS "origenId",m.observaciones
    FROM movimientos m JOIN productos_filtrados p ON p.id=m.producto_id
    JOIN bodegas b ON b.id=m.bodega_id JOIN unidades_medida u ON u.id=m.unidad_medida_id WHERE ${enPeriodo}`;
  const sql = base + (detalle ? filas : resumen) + ')';
  // One statement/snapshot, including the total even for an empty page.
  const [result] = await sequelize.query(
    `${sql} SELECT (SELECT COUNT(*) FROM datos)::int AS total,
    COALESCE((SELECT json_agg(f) FROM (SELECT * FROM datos ORDER BY ${detalle ? 'fecha DESC, "detalleId"' : 'codigo, "unidadMedidaId"'} LIMIT :limit OFFSET :offset) f),'[]'::json) AS filas`,
    { replacements, type: QueryTypes.SELECT },
  );
  if (exportar && result.total > 10000)
    throw error('La exportación supera 10000 filas; reduzca los filtros');
  return {
    filas: result.filas.map((row) => metricas(row, meses)),
    total: result.total,
    pagina: exportar ? 1 : pagina,
    limite: exportar ? 10000 : limite,
    metadata: {
      fechaDesde: query.fechaDesde,
      fechaHasta: query.fechaHasta,
      filtros: {
        bodegaId: replacements.bodegaId,
        productoId: replacements.productoId,
        categoriaProductoId: replacements.categoriaProductoId,
        tipoProducto: replacements.tipoProducto,
        codigo: query.codigo || null,
      },
      dias,
      meses,
      zonaHoraria: 'America/Bogota',
      fechaConsulta: new Date().toISOString(),
      promedioMensual: 'salidas / (dias inclusivos / 30)',
      stockSeguridad: 'promedioMensual / 0.5',
      inventarioDisponible:
        'Saldo actual de todos los movimientos APLICADOS, independiente del rango; null si hay AJ/TR sin sentido. Separado por unidad, sin conversiones.',
    },
  };
}
module.exports = { informe, periodo, metricas };
