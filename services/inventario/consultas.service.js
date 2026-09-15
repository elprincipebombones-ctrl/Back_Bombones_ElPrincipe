const { QueryTypes } = require('sequelize');
const { sequelize, Producto } = require('../../models');
const { periodo } = require('./informes.service');
const direccion = `CASE WHEN m.tipo_documento='EN' THEN 1 WHEN m.tipo_documento='SA' THEN -1 WHEN d.sentido='ENTRADA' THEN 1 WHEN d.sentido='SALIDA' THEN -1 ELSE 0 END`;
function filtros(query) {
  if (query.tipoProducto)
    throw Object.assign(
      new Error('Filtro MP/PT pendiente de integrar los cambios del maestro de productos'),
      { status: 409 },
    );
  return {
    bodegaId: query.bodegaId || null,
    productoId: query.productoId || null,
    categoriaProductoId: query.categoriaProductoId || null,
    codigo: query.codigo ? `%${query.codigo}%` : null,
    limit: Number(query.limite || 50),
    offset: (Number(query.pagina || 1) - 1) * Number(query.limite || 50),
  };
}
async function existencias(query) {
  const replacements = filtros(query);
  const [r] = await sequelize.query(
    `WITH movimientos AS (
    SELECT d.*,m.bodega_id,${direccion} AS signo FROM detalle_movimiento d JOIN movimientos_inventario m ON m.id=d.movimiento_inventario_id
    WHERE m.estado='APLICADO' AND m.fecha<=CURRENT_TIMESTAMP
  ), datos AS (
    SELECT p.id AS "productoId",p.codigo,p.nombre,p.descripcion,p.categoria_producto_id AS "categoriaProductoId",
      b.id AS "bodegaId",b.nombre AS bodega,b.estado AS "bodegaActiva",p.estado AS "productoActivo",
      COALESCE(d.unidad_medida_id,p.unidad_medida_id) AS "unidadMedidaId",u.simbolo AS unidad,
      COALESCE(d.lote,d.lote_proveedor) AS lote,d.fecha_vencimiento AS "fechaVencimiento",
      COALESCE(SUM(d.cantidad*d.signo),0)::text AS "saldoConocido",
      COUNT(d.id) FILTER(WHERE d.signo=0)::int AS "movimientosSinSentido",
      CASE WHEN COUNT(d.id) FILTER(WHERE d.signo=0)>0 THEN NULL ELSE COALESCE(SUM(d.cantidad*d.signo),0)::text END AS "inventarioDisponible"
    FROM productos p CROSS JOIN bodegas b LEFT JOIN movimientos d ON d.producto_id=p.id AND d.bodega_id=b.id
    JOIN unidades_medida u ON u.id=COALESCE(d.unidad_medida_id,p.unidad_medida_id)
    WHERE (:bodegaId::uuid IS NULL OR b.id=:bodegaId::uuid) AND (:productoId::uuid IS NULL OR p.id=:productoId::uuid)
      AND (:categoriaProductoId::uuid IS NULL OR p.categoria_producto_id=:categoriaProductoId::uuid)
      AND (:codigo::text IS NULL OR p.codigo ILIKE :codigo)
    GROUP BY p.id,p.codigo,p.nombre,p.descripcion,p.categoria_producto_id,p.estado,p.unidad_medida_id,b.id,b.nombre,b.estado,d.unidad_medida_id,u.simbolo,COALESCE(d.lote,d.lote_proveedor),d.fecha_vencimiento
  ) SELECT (SELECT COUNT(*)::int FROM datos) AS total,
    COALESCE((SELECT json_agg(f) FROM (SELECT * FROM datos ORDER BY codigo,"bodegaId","unidadMedidaId",lote NULLS FIRST,"fechaVencimiento" NULLS FIRST LIMIT :limit OFFSET :offset) f),'[]'::json) AS filas`,
    { replacements, type: QueryTypes.SELECT },
  );
  return {
    ...r,
    pagina: Number(query.pagina || 1),
    limite: replacements.limit,
    metadata: {
      filtroTipoProducto: false,
      fechaConsulta: new Date().toISOString(),
      agrupacion: 'producto/bodega/unidad/lote/vencimiento',
    },
  };
}
async function kardex(query, exportar = false) {
  if (!query.productoId)
    throw Object.assign(new Error('productoId es obligatorio para consultar el kardex'), {
      status: 422,
    });
  periodo(query.fechaDesde, query.fechaHasta);
  if (!(await Producto.findByPk(query.productoId, { attributes: ['id'] })))
    throw Object.assign(new Error('Producto no encontrado'), { status: 404 });
  const replacements = {
    ...filtros(query),
    fechaDesde: query.fechaDesde,
    fechaHasta: query.fechaHasta,
  };
  if (exportar) {
    replacements.limit = 10001;
    replacements.offset = 0;
  }
  const [r] = await sequelize.query(
    `WITH historia AS (
    SELECT d.id AS "detalleId",m.id AS "movimientoInventarioId",m.operacion_id AS "operacionId",m.fecha,m.tipo_documento AS "tipoDocumento",
      m.numero_documento AS "numeroDocumento",m.bodega_id AS "bodegaId",b.nombre AS bodega,p.id AS "productoId",p.codigo,p.nombre,
      d.unidad_medida_id AS "unidadMedidaId",u.simbolo AS unidad,COALESCE(d.lote,d.lote_proveedor) AS lote,
      d.fecha_vencimiento AS "fechaVencimiento",m.origen,m.observaciones AS nota,d.cantidad,${direccion} AS signo
    FROM detalle_movimiento d JOIN movimientos_inventario m ON m.id=d.movimiento_inventario_id
    JOIN bodegas b ON b.id=m.bodega_id JOIN productos p ON p.id=d.producto_id JOIN unidades_medida u ON u.id=d.unidad_medida_id
    WHERE d.producto_id=:productoId::uuid AND (:bodegaId::uuid IS NULL OR m.bodega_id=:bodegaId::uuid)
      AND m.estado='APLICADO' AND m.fecha<((:fechaHasta::date+1)::timestamp AT TIME ZONE 'America/Bogota')
  ), acumulado AS (
    SELECT *,CASE WHEN signo=1 THEN cantidad ELSE 0 END::text AS entradas,CASE WHEN signo=-1 THEN cantidad ELSE 0 END::text AS salidas,
      CASE WHEN signo=1 THEN 'ENTRADA' WHEN signo=-1 THEN 'SALIDA' END AS sentido,
      SUM(cantidad*signo) OVER w AS "saldoConocido",
      COUNT(*) FILTER(WHERE signo=0) OVER w AS pendientes
    FROM historia WINDOW w AS(PARTITION BY "bodegaId","unidadMedidaId" ORDER BY fecha,"movimientoInventarioId","detalleId" ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
  ), datos AS (
    SELECT *,CASE WHEN pendientes>0 THEN NULL ELSE "saldoConocido"::text END AS saldo
    FROM acumulado WHERE fecha>=(:fechaDesde::date::timestamp AT TIME ZONE 'America/Bogota')
  ), saldos AS (
    SELECT "bodegaId",bodega,"unidadMedidaId",unidad,
      CASE WHEN COUNT(*) FILTER(WHERE signo=0 AND fecha<(:fechaDesde::date::timestamp AT TIME ZONE 'America/Bogota'))>0 THEN NULL
        ELSE COALESCE(SUM(cantidad*signo) FILTER(WHERE fecha<(:fechaDesde::date::timestamp AT TIME ZONE 'America/Bogota')),0)::text END AS "saldoInicial",
      CASE WHEN COUNT(*) FILTER(WHERE signo=0)>0 THEN NULL ELSE SUM(cantidad*signo)::text END AS "saldoFinal",
      COALESCE(SUM(cantidad) FILTER(WHERE signo=1 AND fecha>=(:fechaDesde::date::timestamp AT TIME ZONE 'America/Bogota')),0)::text AS entradas,
      COALESCE(SUM(cantidad) FILTER(WHERE signo=-1 AND fecha>=(:fechaDesde::date::timestamp AT TIME ZONE 'America/Bogota')),0)::text AS salidas,
      COUNT(*) FILTER(WHERE signo=0)::int AS "movimientosSinSentido"
    FROM historia GROUP BY "bodegaId",bodega,"unidadMedidaId",unidad
  ) SELECT (SELECT COUNT(*)::int FROM datos) AS total,
    COALESCE((SELECT json_agg(f) FROM (SELECT * FROM datos ORDER BY fecha,"movimientoInventarioId","detalleId" LIMIT :limit OFFSET :offset) f),'[]'::json) AS filas,
    COALESCE((SELECT json_agg(s) FROM (SELECT * FROM saldos ORDER BY bodega,"unidadMedidaId") s),'[]'::json) AS saldos`,
    { replacements, type: QueryTypes.SELECT },
  );
  if (exportar && r.total > 10000)
    throw Object.assign(new Error('La exportación supera 10000 filas; reduzca los filtros'), {
      status: 422,
    });
  return {
    ...r,
    pagina: exportar ? 1 : Number(query.pagina || 1),
    limite: replacements.limit,
    metadata: {
      productoId: query.productoId,
      bodegaId: query.bodegaId || null,
      fechaDesde: query.fechaDesde,
      fechaHasta: query.fechaHasta,
      zonaHoraria: 'America/Bogota',
      saldos: r.saldos,
      agrupacion:
        'Saldos por bodega/unidad. El saldo inicial incluye movimientos anteriores al rango.',
    },
  };
}
module.exports = { existencias, kardex };
