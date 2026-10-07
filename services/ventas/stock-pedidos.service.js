const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../models');

const consulta = `
  WITH movimientos AS (
    SELECT
      d.producto_id,
      d.unidad_medida_id,
      m.bodega_id,
      COALESCE(d.lote, d.lote_proveedor) AS lote,
      d.fecha_vencimiento,
      d.cantidad,
      CASE
        WHEN m.tipo_documento IN ('EN', 'AJN', 'TRN') THEN 1
        WHEN m.tipo_documento IN ('SA', 'AJS', 'TRS') THEN -1
        WHEN d.sentido = 'ENTRADA' THEN 1
        WHEN d.sentido = 'SALIDA' THEN -1
        ELSE 0
      END AS signo
    FROM detalle_movimiento d
    JOIN movimientos_inventario m ON m.id = d.movimiento_inventario_id
    WHERE m.estado = 'APLICADO' AND m.fecha <= statement_timestamp()
  ), lotes AS (
    SELECT
      producto_id,
      unidad_medida_id,
      bodega_id,
      lote,
      fecha_vencimiento,
      SUM(cantidad * signo)::text AS saldo,
      COUNT(*) FILTER (WHERE signo = 0)::int AS pendientes
    FROM movimientos
    GROUP BY producto_id, unidad_medida_id, bodega_id, lote, fecha_vencimiento
  )
  SELECT
    p.id AS "productoId",
    p.codigo,
    p.nombre,
    p.unidad_medida_id AS "unidadMedidaId",
    u.simbolo AS unidad,
    l.bodega_id AS "bodegaId",
    b.nombre AS bodega,
    b.estado AS "bodegaActiva",
    l.lote,
    l.fecha_vencimiento AS "fechaVencimiento",
    l.saldo,
    COALESCE(l.pendientes, 0) AS pendientes
  FROM productos p
  JOIN unidades_medida u ON u.id = p.unidad_medida_id
  LEFT JOIN lotes l ON l.producto_id = p.id
    AND l.unidad_medida_id = p.unidad_medida_id
  LEFT JOIN bodegas b ON b.id = l.bodega_id
  WHERE p.tipo_producto = 'PT' AND p.estado = true
  ORDER BY p.nombre, l.fecha_vencimiento ASC NULLS LAST, l.lote, b.nombre
`;

async function productosDisponibles(productoIds = null, transaction = null) {
  const rows = await sequelize.query(consulta, {
    type: QueryTypes.SELECT,
    transaction,
  });
  const productos = new Map();

  for (const row of rows) {
    let producto = productos.get(row.productoId);
    if (!producto) {
      producto = {
        id: row.productoId,
        codigo: row.codigo,
        nombre: row.nombre,
        unidadMedidaId: row.unidadMedidaId,
        unidad: row.unidad,
        stockDisponible: 0,
        stockIndeterminado: false,
        lotes: [],
      };
      productos.set(row.productoId, producto);
    }
    if (row.pendientes > 0) producto.stockIndeterminado = true;
    const saldo = Number(row.saldo || 0);
    if (row.bodegaId && row.bodegaActiva && saldo > 0 && row.pendientes === 0) {
      producto.lotes.push({
        lote: row.lote,
        fechaVencimiento: row.fechaVencimiento,
        bodegaId: row.bodegaId,
        bodega: row.bodega,
        disponible: saldo,
        unidad: row.unidad,
      });
      producto.stockDisponible = Number((producto.stockDisponible + saldo).toFixed(6));
    }
  }
  const resultado = [...productos.values()];
  return productoIds ? resultado.filter((p) => productoIds.includes(p.id)) : resultado;
}

module.exports = { productosDisponibles };
