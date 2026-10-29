// Relaciones documentales reales. Un lote compartido no atribuye consumos entre
// parciales: la cantidad utilizada se conserva por su movimiento de salida.
module.exports = `
WITH raiz AS (
  SELECT :tipo::text AS tipo, :valor::text AS valor,
         :producto::text AS producto, :lote::text AS lote
),
despachos_base AS (
  SELECT d.id AS detalle_id, d.pedido_venta_id, d.producto_id,
         x."despachoId" AS despacho_id, x."movimientoId" AS movimiento_id,
         x.fecha, x.cantidad, x.lote, x."bodegaId" AS bodega_id
  FROM pedido_venta_detalle d
  CROSS JOIN LATERAL jsonb_to_recordset(COALESCE(d.despachos, '[]'::jsonb))
    AS x("despachoId" uuid, "movimientoId" uuid, fecha timestamptz,
         cantidad numeric, lote text, "bodegaId" uuid)
),
pares_raiz AS (
  SELECT p.id AS producto_id, r.lote
  FROM raiz r JOIN productos p ON p.codigo = r.producto
  WHERE (r.tipo = 'pt' AND p.tipo_producto = 'PT')
     OR (r.tipo = 'mp' AND p.tipo_producto <> 'PT')
  UNION
  SELECT db.producto_id, db.lote FROM despachos_base db
  JOIN pedidos_venta p ON p.id = db.pedido_venta_id
  LEFT JOIN movimientos_inventario m ON m.id = db.movimiento_id
  CROSS JOIN raiz r
  WHERE (r.tipo = 'pedido' AND p.numero = r.valor)
     OR (r.tipo = 'despacho' AND m.numero_documento = r.valor)
  UNION
  SELECT d.producto_id, d.lote FROM detalle_movimiento d
  JOIN movimientos_inventario m ON m.id = d.movimiento_inventario_id
  JOIN recepciones rc ON rc.id = m.origen_id AND m.origen = 'RECEPCION'
  CROSS JOIN raiz r WHERE r.tipo = 'recepcion' AND rc.numero = r.valor
),
vinculos_ot AS (
  SELECT id AS orden_id, movimiento_salida_id AS movimiento_id, 'INICIAL' AS etapa
  FROM ordenes_produccion WHERE movimiento_salida_id IS NOT NULL
  UNION ALL
  SELECT id, movimiento_pep_id, 'INGRESO_PEP'
  FROM ordenes_produccion WHERE movimiento_pep_id IS NOT NULL
  UNION ALL
  SELECT id, movimiento_entrada_id, 'ENTRADA_PT'
  FROM ordenes_produccion WHERE movimiento_entrada_id IS NOT NULL
  UNION ALL
  SELECT orden_produccion_id, movimiento_salida_id, 'CONSUMO_PEP'
  FROM reportes_produccion WHERE movimiento_salida_id IS NOT NULL
  UNION ALL
  SELECT orden_produccion_id, movimiento_entrada_id, 'ENTRADA_PT'
  FROM reportes_produccion WHERE movimiento_entrada_id IS NOT NULL
  UNION ALL
  SELECT orden_produccion_id, movimiento_salida_id, tipo
  FROM solicitudes_movimiento_ot WHERE estado = 'ATENDIDA' AND movimiento_salida_id IS NOT NULL
  UNION ALL
  SELECT orden_produccion_id, movimiento_entrada_id, tipo
  FROM solicitudes_movimiento_ot WHERE estado = 'ATENDIDA' AND movimiento_entrada_id IS NOT NULL
),
ordenes AS (
  SELECT o.* FROM ordenes_produccion o CROSS JOIN raiz r
  WHERE (r.tipo = 'ot' AND o.numero = r.valor)
     OR (r.tipo = 'pt' AND EXISTS (
       SELECT 1 FROM resultados_produccion rp JOIN pares_raiz pr
         ON pr.producto_id = rp.producto_terminado_id AND pr.lote = rp.lote_pt
       WHERE rp.orden_produccion_id = o.id
     ))
     OR EXISTS (
       SELECT 1 FROM vinculos_ot v
       JOIN detalle_movimiento d ON d.movimiento_inventario_id = v.movimiento_id
       JOIN pares_raiz pr ON pr.producto_id = d.producto_id AND pr.lote = d.lote
       JOIN productos p ON p.id = d.producto_id
       WHERE v.orden_id = o.id
         AND ((p.tipo_producto = 'PT' AND v.etapa = 'ENTRADA_PT')
           OR (p.tipo_producto <> 'PT' AND r.tipo IN ('mp', 'recepcion')))
     )
),
movimientos_ot AS (
  SELECT DISTINCT v.* FROM vinculos_ot v JOIN ordenes o ON o.id = v.orden_id
),
pares AS (
  SELECT * FROM pares_raiz
  UNION
  SELECT d.producto_id, d.lote FROM detalle_movimiento d
  JOIN movimientos_ot v ON v.movimiento_id = d.movimiento_inventario_id
),
pares_pt AS (
  SELECT pr.* FROM pares pr JOIN productos p ON p.id = pr.producto_id
  WHERE p.tipo_producto = 'PT' AND pr.lote IS NOT NULL
),
despachos_rel AS (
  SELECT db.* FROM despachos_base db
  WHERE EXISTS (SELECT 1 FROM pares_pt p WHERE p.producto_id = db.producto_id AND p.lote = db.lote)
     OR EXISTS (SELECT 1 FROM pedidos_venta p CROSS JOIN raiz r
                WHERE r.tipo = 'pedido' AND p.numero = r.valor AND p.id = db.pedido_venta_id)
     OR EXISTS (SELECT 1 FROM movimientos_inventario m CROSS JOIN raiz r
                WHERE r.tipo = 'despacho' AND m.numero_documento = r.valor AND m.id = db.movimiento_id)
),
pedidos_rel AS (
  SELECT p.* FROM pedidos_venta p WHERE p.id IN (SELECT pedido_venta_id FROM despachos_rel)
     OR EXISTS (SELECT 1 FROM raiz r WHERE r.tipo = 'pedido' AND p.numero = r.valor)
),
recepciones_rel AS (
  SELECT rc.* FROM recepciones rc WHERE EXISTS (
    SELECT 1 FROM movimientos_inventario m
    JOIN detalle_movimiento d ON d.movimiento_inventario_id = m.id
    JOIN pares pr ON pr.producto_id = d.producto_id AND pr.lote = d.lote
    WHERE m.origen = 'RECEPCION' AND m.origen_id = rc.id
  ) OR EXISTS (SELECT 1 FROM raiz r WHERE r.tipo = 'recepcion' AND rc.numero = r.valor)
),
inventario_rel AS (
  SELECT d.*, m.numero_documento, m.tipo_documento, m.fecha, m.bodega_id,
         m.origen, m.origen_id, m.estado
  FROM detalle_movimiento d JOIN movimientos_inventario m ON m.id = d.movimiento_inventario_id
  WHERE EXISTS (SELECT 1 FROM pares pr WHERE pr.producto_id = d.producto_id AND pr.lote = d.lote)
     OR m.id IN (SELECT movimiento_id FROM movimientos_ot)
     OR (m.origen = 'RECEPCION' AND m.origen_id IN (SELECT id FROM recepciones_rel))
),
inspecciones_rel AS (
  SELECT i.* FROM inspecciones i WHERE i.orden_produccion_id IN (SELECT id FROM ordenes)
     OR EXISTS (SELECT 1 FROM pares p WHERE p.producto_id = i.producto_id AND p.lote = i.lote)
)
`;
