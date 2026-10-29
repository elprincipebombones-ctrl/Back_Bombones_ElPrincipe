const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../models');
const { ApiError } = require('../../utils/ApiError');

const numero = (valor) => (valor === null || valor === undefined ? null : Number(valor));
const textoLote = (valor) => (valor === null || valor === undefined ? null : String(valor));
const usuario = (id, nombre, correo) => (id ? { id, nombre, correo } : null);

const consulta = (database, sql, replacements = {}) =>
  database.query(sql, { replacements, type: QueryTypes.SELECT });

const buscarLotes = async (filtros = {}, database = sequelize) => {
  const pagina = Number(filtros.pagina || 1);
  const limite = Number(filtros.limite || 50);
  const replacements = {
    lote: filtros.lote ? `%${filtros.lote.trim()}%` : null,
    productoId: filtros.productoId || null,
    ordenProduccionId: filtros.ordenProduccionId || null,
    estadoOrden: filtros.estadoOrden || null,
    fechaDesde: filtros.fechaDesde || null,
    fechaHasta: filtros.fechaHasta || null,
    limite,
    offset: (pagina - 1) * limite,
  };
  const [resultado] = await consulta(
    database,
    `WITH lotes AS (
      SELECT rp.id AS "resultadoProduccionId", rp.lote_pt AS lote,
        rp.producto_terminado_id AS "productoId", p.codigo AS "productoCodigo",
        p.nombre AS "productoNombre", rp.cantidad_planeada AS "cantidadPlaneada",
        rp.cantidad_producida AS "cantidadProducida", u.simbolo AS unidad,
        rp.fecha_vencimiento_final AS "fechaVencimiento", rp.bodega_destino_id AS "bodegaDestinoId",
        b.nombre AS "bodegaDestino", op.id AS "ordenProduccionId", op.numero AS "ordenNumero",
        op.estado AS "estadoOrden", op.fecha AS "fechaOrden", op.fecha_inicio AS "fechaInicio",
        op.fecha_finalizacion AS "fechaFinalizacion"
      FROM resultados_produccion rp
      JOIN ordenes_produccion op ON op.id=rp.orden_produccion_id
      JOIN productos p ON p.id=rp.producto_terminado_id
      JOIN unidades_medida u ON u.id=rp.unidad_medida_id
      LEFT JOIN bodegas b ON b.id=rp.bodega_destino_id
      WHERE rp.lote_pt IS NOT NULL
        AND (:lote::text IS NULL OR rp.lote_pt ILIKE :lote)
        AND (:productoId::uuid IS NULL OR rp.producto_terminado_id=:productoId)
        AND (:ordenProduccionId::uuid IS NULL OR op.id=:ordenProduccionId)
        AND (:estadoOrden::text IS NULL OR op.estado=:estadoOrden)
        AND (:fechaDesde::date IS NULL OR op.fecha>=:fechaDesde)
        AND (:fechaHasta::date IS NULL OR op.fecha<=:fechaHasta)
    ) SELECT (SELECT COUNT(*)::int FROM lotes) AS total,
      COALESCE((SELECT json_agg(x) FROM (SELECT * FROM lotes
        ORDER BY "fechaOrden" DESC, "ordenNumero", lote LIMIT :limite OFFSET :offset) x),'[]'::json) AS filas`,
    replacements,
  );
  return { filas: resultado.filas, total: resultado.total, pagina, limite };
};

const obtenerCabeceras = (lote, filtros, database) =>
  consulta(
    database,
    `SELECT rp.id AS "resultadoProduccionId", rp.lote_pt AS lote,
      rp.producto_terminado_id AS "productoId", p.codigo AS "productoCodigo",
      p.nombre AS "productoNombre", p.descripcion AS "productoDescripcion",
      rp.cantidad_planeada AS "cantidadPlaneada", rp.cantidad_producida AS "cantidadProducida",
      rp.unidad_medida_id AS "unidadMedidaId", u.codigo AS "unidadCodigo", u.nombre AS "unidadNombre",
      u.simbolo AS "unidadSimbolo", rp.fecha_vencimiento_sugerida AS "fechaVencimientoSugerida",
      rp.fecha_vencimiento_final AS "fechaVencimientoFinal", rp.bodega_destino_id AS "bodegaDestinoId",
      b.codigo AS "bodegaDestinoCodigo", b.nombre AS "bodegaDestinoNombre",
      op.id AS "ordenProduccionId", op.numero AS "ordenNumero", op.fecha AS "fechaOrden",
      op.estado AS "estadoOrden", op.observaciones AS "ordenObservaciones",
      op.fecha_inicio AS "fechaInicio", op.fecha_salida_mp AS "fechaSalidaMp",
      op.fecha_finalizacion AS "fechaFinalizacion", op.movimiento_salida_id AS "movimientoSalidaId",
      op.movimiento_pep_id AS "movimientoPepId", op.movimiento_entrada_id AS "movimientoEntradaId",
      op.usuario_id AS "responsableId", ur.nombre AS "responsableNombre", ur.correo AS "responsableCorreo",
      op.usuario_inicio_id AS "usuarioInicioId", ui.nombre AS "usuarioInicioNombre", ui.correo AS "usuarioInicioCorreo",
      op.usuario_salida_mp_id AS "usuarioSalidaId", us.nombre AS "usuarioSalidaNombre", us.correo AS "usuarioSalidaCorreo",
      op.usuario_finalizacion_id AS "usuarioFinalizacionId", uf.nombre AS "usuarioFinalizacionNombre",
      uf.correo AS "usuarioFinalizacionCorreo"
    FROM resultados_produccion rp
    JOIN ordenes_produccion op ON op.id=rp.orden_produccion_id
    JOIN productos p ON p.id=rp.producto_terminado_id
    JOIN unidades_medida u ON u.id=rp.unidad_medida_id
    LEFT JOIN bodegas b ON b.id=rp.bodega_destino_id
    LEFT JOIN usuarios ur ON ur.id=op.usuario_id LEFT JOIN usuarios ui ON ui.id=op.usuario_inicio_id
    LEFT JOIN usuarios us ON us.id=op.usuario_salida_mp_id LEFT JOIN usuarios uf ON uf.id=op.usuario_finalizacion_id
    WHERE rp.lote_pt=:lote
      AND (:productoId::uuid IS NULL OR rp.producto_terminado_id=:productoId)
      AND (:ordenProduccionId::uuid IS NULL OR op.id=:ordenProduccionId)
    ORDER BY op.fecha DESC, op.numero`,
    {
      lote,
      productoId: filtros.productoId || null,
      ordenProduccionId: filtros.ordenProduccionId || null,
    },
  );

const obtenerConsumos = (ordenId, esParcial, database) =>
  consulta(
    database,
    `SELECT d.id AS "detalleMovimientoId", m.id AS "movimientoId", m.tipo_documento AS "tipoDocumento",
      m.numero_documento AS "numeroDocumento", m.fecha, m.origen, m.origen_id AS "origenId",
      d.producto_id AS "productoId", p.codigo AS "productoCodigo", p.nombre AS "productoNombre",
      d.unidad_medida_id AS "unidadMedidaId", u.simbolo AS unidad, d.cantidad,
      COALESCE(d.lote,d.lote_proveedor) AS lote, d.lote_proveedor AS "loteProveedor",
      d.fecha_vencimiento AS "fechaVencimiento", m.bodega_id AS "bodegaId", b.codigo AS "bodegaCodigo",
      b.nombre AS "bodegaNombre", d.observaciones, r.id AS "reporteProduccionId"
    FROM detalle_movimiento d JOIN movimientos_inventario m ON m.id=d.movimiento_inventario_id
    JOIN productos p ON p.id=d.producto_id JOIN unidades_medida u ON u.id=d.unidad_medida_id
    JOIN bodegas b ON b.id=m.bodega_id
    LEFT JOIN reportes_produccion r ON r.movimiento_salida_id=m.id AND r.orden_produccion_id=:ordenId
    WHERE m.estado='APLICADO' AND d.sentido='SALIDA' AND (
      (:esParcial = false AND m.origen='OT' AND m.origen_id=:ordenId)
      OR (:esParcial = true AND r.id IS NOT NULL)
    ) ORDER BY m.fecha,d.id`,
    { ordenId, esParcial },
  );

const obtenerRecepcionesOrigen = async (consumos, database) => {
  if (!consumos.length) return [];
  const productos = [...new Set(consumos.map((item) => item.productoId))];
  const filas = await consulta(
    database,
    `SELECT dr.id AS "detalleRecepcionId", dr.producto_id AS "productoId",
      dr.cantidad_recibida AS "cantidadRecibida", dr.unidad_medida_id AS "unidadMedidaId",
      u.simbolo AS unidad, dr.lote_proveedor AS lote, dr.fecha_vencimiento AS "fechaVencimiento",
      dr.observaciones AS "detalleObservaciones", r.id AS "recepcionId", r.numero AS "recepcionNumero",
      r.fecha_recepcion AS "fechaRecepcion", r.estado AS "recepcionEstado", r.tiene_novedades AS "tieneNovedades",
      r.observaciones AS "recepcionObservaciones", pr.id AS "proveedorId", pr.numero_documento AS "proveedorDocumento",
      pr.razon_social AS "proveedorRazonSocial", pr.nombre_comercial AS "proveedorNombreComercial",
      m.id AS "movimientoEntradaId", m.numero_documento AS "movimientoEntradaNumero",
      ur.id AS "usuarioRecepcionId", ur.nombre AS "usuarioRecepcionNombre", ur.correo AS "usuarioRecepcionCorreo"
    FROM detalles_recepcion dr JOIN recepciones r ON r.id=dr.recepcion_id
    JOIN proveedores pr ON pr.id=r.proveedor_id JOIN unidades_medida u ON u.id=dr.unidad_medida_id
    LEFT JOIN movimientos_inventario m ON m.origen='RECEPCION' AND m.origen_id=r.id AND m.estado='APLICADO'
    LEFT JOIN usuarios ur ON ur.id=r.usuario_recepcion_id
    WHERE dr.producto_id IN (:productos) AND r.estado='TERMINADA'
    ORDER BY r.fecha_recepcion, r.numero, dr.id`,
    { productos },
  );
  return consumos.map((consumo) => {
    const candidatas = filas.filter(
      (fila) =>
        fila.productoId === consumo.productoId &&
        textoLote(fila.lote) === textoLote(consumo.lote) &&
        textoLote(fila.fechaVencimiento) === textoLote(consumo.fechaVencimiento),
    );
    return {
      detalleMovimientoId: consumo.detalleMovimientoId,
      estadoVinculo: candidatas.length === 1 ? 'UNICO' : candidatas.length ? 'AMBIGUO' : 'NO_ENCONTRADO',
      criterioVinculo: 'PRODUCTO_LOTE_VENCIMIENTO',
      recepciones: candidatas.map((fila) => ({
        ...fila,
        cantidadRecibida: numero(fila.cantidadRecibida),
        responsable: usuario(
          fila.usuarioRecepcionId,
          fila.usuarioRecepcionNombre,
          fila.usuarioRecepcionCorreo,
        ),
        usuarioRecepcionId: undefined,
        usuarioRecepcionNombre: undefined,
        usuarioRecepcionCorreo: undefined,
      })),
    };
  });
};

const obtenerControlesRecepcion = async (recepcionIds, database) => {
  if (!recepcionIds.length) return [];
  const [generales, temperaturas, acciones, vehiculos] = await Promise.all([
    consulta(database, `SELECT r.id AS "recepcionId", row_to_json(v) AS verificacion,
      row_to_json(c) AS "condicionAmbiental", row_to_json(rr) AS resultado
      FROM recepciones r LEFT JOIN verificaciones_recepcion v ON v.recepcion_id=r.id
      LEFT JOIN condiciones_ambientales_recepcion c ON c.recepcion_id=r.id
      LEFT JOIN resultados_recepcion rr ON rr.recepcion_id=r.id WHERE r.id IN (:ids)`, { ids: recepcionIds }),
    consulta(database, `SELECT t.*,t.recepcion_id AS "recepcionId",t.producto_id AS "productoId",
      t.detalle_recepcion_id AS "detalleRecepcionId",p.codigo AS "productoCodigo",p.nombre AS "productoNombre",
      ct.temperatura_minima AS "criterioMinimo",ct.temperatura_maxima AS "criterioMaximo"
      FROM temperaturas_recepcion t JOIN productos p ON p.id=t.producto_id
      LEFT JOIN condiciones_termicas ct ON ct.id=p.condicion_termica_id WHERE t.recepcion_id IN (:ids)
      ORDER BY t.hora,t.id`, { ids: recepcionIds }),
    consulta(database, `SELECT a.*,a.recepcion_id AS "recepcionId",a.detalle_recepcion_id AS "detalleRecepcionId"
      FROM acciones_mejora_recepcion a WHERE a.recepcion_id IN (:ids) ORDER BY a.created_at,a.id`, { ids: recepcionIds }),
    consulta(database, `SELECT rv.*,rv.recepcion_id AS "recepcionId" FROM recepciones_vehiculos rv
      WHERE rv.recepcion_id IN (:ids) ORDER BY rv.created_at,rv.id`, { ids: recepcionIds }),
  ]);
  return recepcionIds.map((id) => ({
    recepcionId: id,
    verificacion: generales.find((x) => x.recepcionId === id)?.verificacion || null,
    condicionAmbiental: generales.find((x) => x.recepcionId === id)?.condicionAmbiental || null,
    resultado: generales.find((x) => x.recepcionId === id)?.resultado || null,
    temperaturas: temperaturas.filter((x) => x.recepcionId === id).map((x) => ({
      ...x,
      temperatura: numero(x.temperatura),
      criterioMinimo: numero(x.criterioMinimo),
      criterioMaximo: numero(x.criterioMaximo),
    })),
    accionesMejora: acciones.filter((x) => x.recepcionId === id),
    vehiculos: vehiculos.filter((x) => x.recepcionId === id),
  }));
};

const obtenerMermas = (ordenId, database) =>
  consulta(database, `SELECT mp.id,mp.tipo_merma AS "tipoMerma",mp.producto_id AS "productoId",
    p.codigo AS "productoCodigo",p.nombre AS "productoNombre",mp.cantidad,
    mp.unidad_medida_id AS "unidadMedidaId",u.simbolo AS unidad,mm.codigo AS "motivoCodigo",
    mm.nombre AS "motivoNombre",mp.observacion,mp.fecha,
    us.id AS "usuarioId",us.nombre AS "usuarioNombre",us.correo AS "usuarioCorreo"
    FROM mermas_produccion mp JOIN productos p ON p.id=mp.producto_id
    JOIN unidades_medida u ON u.id=mp.unidad_medida_id
    JOIN motivos_merma mm ON mm.id=mp.motivo_merma_id LEFT JOIN usuarios us ON us.id=mp.usuario_id
    WHERE mp.orden_produccion_id=:ordenId ORDER BY mp.fecha,mp.id`, { ordenId });

const obtenerParciales = (ordenId, database) =>
  consulta(database, `SELECT r.id,r.fecha,r.cantidad,r.lote,r.producto_terminado_id AS "productoId",
    p.codigo AS "productoCodigo",p.nombre AS "productoNombre",u.simbolo AS unidad,
    r.movimiento_salida_id AS "movimientoSalidaId",r.movimiento_entrada_id AS "movimientoEntradaId",
    us.id AS "usuarioId",us.nombre AS "usuarioNombre",us.correo AS "usuarioCorreo"
    FROM reportes_produccion r JOIN productos p ON p.id=r.producto_terminado_id
    JOIN unidades_medida u ON u.id=r.unidad_medida_id LEFT JOIN usuarios us ON us.id=r.usuario_id
    WHERE r.orden_produccion_id=:ordenId ORDER BY r.fecha,r.id`, { ordenId });

const obtenerMovimientosPt = (productoId, lote, ordenId, database) =>
  consulta(database, `SELECT m.id,m.tipo_documento AS "tipoDocumento",m.numero_documento AS "numeroDocumento",
    m.fecha,m.estado,m.origen,m.origen_id AS "origenId",m.bodega_id AS "bodegaId",b.nombre AS bodega,
    d.id AS "detalleMovimientoId",d.cantidad,u.simbolo AS unidad,d.sentido,d.fecha_vencimiento AS "fechaVencimiento"
    FROM detalle_movimiento d JOIN movimientos_inventario m ON m.id=d.movimiento_inventario_id
    JOIN bodegas b ON b.id=m.bodega_id JOIN unidades_medida u ON u.id=d.unidad_medida_id
    WHERE d.producto_id=:productoId AND COALESCE(d.lote,d.lote_proveedor)=:lote AND m.estado='APLICADO'
      AND NOT (m.origen='OT' AND m.origen_id=:ordenId AND d.sentido='SALIDA')
    ORDER BY m.fecha,m.id,d.id`, { productoId, lote, ordenId });

const obtenerTrazabilidadAdelante = async (
  productoId,
  lote,
  fechaVencimiento,
  ordenId,
  database,
) => {
  const movimientos = await consulta(
    database,
    `SELECT m.id AS "movimientoId",m.operacion_id AS "operacionId",
      m.tipo_documento AS "tipoDocumento",m.numero_documento AS "numeroDocumento",
      m.fecha,m.estado,m.origen,m.origen_id AS "origenId",m.observaciones,
      m.bodega_id AS "bodegaId",b.codigo AS "bodegaCodigo",b.nombre AS "bodegaNombre",
      d.id AS "detalleMovimientoId",d.cantidad,d.sentido,d.unidad_medida_id AS "unidadMedidaId",
      u.simbolo AS unidad,COALESCE(d.lote,d.lote_proveedor) AS lote,
      d.fecha_vencimiento AS "fechaVencimiento",m.usuario_id AS "responsableId",
      us.nombre AS "responsableNombre",us.correo AS "responsableCorreo",
      pv.id AS "pedidoId",pv.numero AS "pedidoNumero",pv.fecha AS "pedidoFecha",
      pv.observaciones AS "pedidoObservaciones",cl.id AS "clienteId",
      cl.tipo_documento AS "clienteTipoDocumento",cl.numero_documento AS "clienteNumeroDocumento",
      cl.razon_social AS "clienteRazonSocial",cl.nombre_comercial AS "clienteNombreComercial",
      cl.direccion AS "clienteDireccionRegistrada",cl.ciudad AS "clienteCiudadRegistrada",
      bd.id AS "bodegaDestinoId",bd.codigo AS "bodegaDestinoCodigo",bd.nombre AS "bodegaDestinoNombre"
    FROM detalle_movimiento d JOIN movimientos_inventario m ON m.id=d.movimiento_inventario_id
    JOIN bodegas b ON b.id=m.bodega_id JOIN unidades_medida u ON u.id=d.unidad_medida_id
    LEFT JOIN usuarios us ON us.id=m.usuario_id
    LEFT JOIN pedido_venta_detalle pvd ON pvd.producto_id=d.producto_id AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(COALESCE(pvd.despachos,'[]'::jsonb)) despacho
      WHERE despacho->>'movimientoId'=m.id::text)
    LEFT JOIN pedidos_venta pv ON pv.id=pvd.pedido_venta_id
    LEFT JOIN proveedores cl ON cl.id=pv.cliente_id
    LEFT JOIN movimientos_inventario md ON md.operacion_id=m.operacion_id
      AND md.tipo_documento='TRN' AND m.tipo_documento='TRS' AND md.estado='APLICADO'
    LEFT JOIN bodegas bd ON bd.id=md.bodega_id
    WHERE d.producto_id=:productoId AND COALESCE(d.lote,d.lote_proveedor)=:lote
      AND d.fecha_vencimiento IS NOT DISTINCT FROM :fechaVencimiento::date
      AND m.estado='APLICADO'
    ORDER BY m.fecha,m.id,d.id`,
    { productoId, lote, fechaVencimiento: fechaVencimiento || null },
  );
  const clasificados = movimientos.map((fila) => {
    let clasificacion = 'OTRO_MOVIMIENTO';
    if (fila.tipoDocumento === 'SA' && fila.origen === 'PEDIDO_VENTA' && fila.pedidoId)
      clasificacion = 'ENTREGA_CLIENTE';
    else if (['TRS', 'TRN'].includes(fila.tipoDocumento) || fila.origen === 'TRASLADO')
      clasificacion = 'TRASLADO_INTERNO';
    else if (fila.origen === 'OT' && fila.origenId === ordenId && fila.sentido === 'ENTRADA')
      clasificacion = 'ENTRADA_PRODUCCION';
    else if (fila.origen === 'PRODUCCION_PARCIAL' && fila.sentido === 'ENTRADA')
      clasificacion = 'ENTRADA_PRODUCCION_PARCIAL';
    else if (fila.origen === 'AJUSTE_CONTEO' || ['AJN', 'AJS'].includes(fila.tipoDocumento))
      clasificacion = 'AJUSTE_INVENTARIO';
    return {
      ...fila,
      cantidad: numero(fila.cantidad),
      clasificacion,
      responsable: usuario(fila.responsableId, fila.responsableNombre, fila.responsableCorreo),
      cliente: fila.clienteId
        ? {
            id: fila.clienteId,
            tipoDocumento: fila.clienteTipoDocumento,
            numeroDocumento: fila.clienteNumeroDocumento,
            razonSocial: fila.clienteRazonSocial,
            nombreComercial: fila.clienteNombreComercial,
            direccionRegistrada: fila.clienteDireccionRegistrada,
            ciudadRegistrada: fila.clienteCiudadRegistrada,
          }
        : null,
      destinoRegistrado:
        fila.clienteId
          ? {
              tipo: 'DOMICILIO_CLIENTE',
              direccion: fila.clienteDireccionRegistrada,
              ciudad: fila.clienteCiudadRegistrada,
              esDireccionEntregaConfirmada: false,
            }
          : fila.bodegaDestinoId
            ? {
                tipo: 'BODEGA_INTERNA',
                bodegaId: fila.bodegaDestinoId,
                codigo: fila.bodegaDestinoCodigo,
                nombre: fila.bodegaDestinoNombre,
              }
            : null,
    };
  });
  const existencias = new Map();
  for (const movimiento of clasificados) {
    const clave = movimiento.bodegaId;
    const actual = existencias.get(clave) || {
      bodegaId: movimiento.bodegaId,
      bodegaCodigo: movimiento.bodegaCodigo,
      bodegaNombre: movimiento.bodegaNombre,
      unidadMedidaId: movimiento.unidadMedidaId,
      unidad: movimiento.unidad,
      cantidadRestante: 0,
    };
    const signo = ['EN', 'AJN', 'TRN'].includes(movimiento.tipoDocumento)
      ? 1
      : ['SA', 'AJS', 'TRS'].includes(movimiento.tipoDocumento)
        ? -1
        : movimiento.sentido === 'ENTRADA'
          ? 1
          : movimiento.sentido === 'SALIDA'
            ? -1
            : 0;
    actual.cantidadRestante = Number(
      (actual.cantidadRestante + movimiento.cantidad * signo).toFixed(6),
    );
    existencias.set(clave, actual);
  }
  const entregas = clasificados.filter((x) => x.clasificacion === 'ENTREGA_CLIENTE');
  return {
    cantidadEntregada: Number(entregas.reduce((suma, x) => suma + x.cantidad, 0).toFixed(6)),
    unidad: clasificados[0]?.unidad || null,
    entregas,
    trasladosInternos: clasificados.filter((x) => x.clasificacion === 'TRASLADO_INTERNO'),
    otrosMovimientos: clasificados.filter(
      (x) => !['ENTREGA_CLIENTE', 'TRASLADO_INTERNO'].includes(x.clasificacion),
    ),
    existenciasPorBodega: [...existencias.values()].sort((a, b) =>
      a.bodegaNombre.localeCompare(b.bodegaNombre),
    ),
    cantidadRestanteTotal: Number(
      [...existencias.values()].reduce((suma, x) => suma + x.cantidadRestante, 0).toFixed(6),
    ),
    devolucionesCliente: [],
    devolucionesClienteSoportadas: false,
  };
};

const obtenerTrazabilidadInversa = async (
  productoId,
  lote,
  filtros = {},
  database = sequelize,
) => {
  const fechaVencimiento = filtros.fechaVencimiento || null;
  const producto = await consulta(
    database,
    `SELECT p.id,p.codigo,p.nombre,p.descripcion,p.tipo_producto AS "tipoProducto",
      p.unidad_medida_id AS "unidadMedidaId",u.codigo AS "unidadCodigo",u.nombre AS "unidadNombre",
      u.simbolo AS "unidadSimbolo" FROM productos p JOIN unidades_medida u ON u.id=p.unidad_medida_id
      WHERE p.id=:productoId`,
    { productoId },
  );
  if (!producto.length) throw new ApiError('Materia prima no encontrada', 404);
  if (producto[0].tipoProducto === 'PT')
    throw new ApiError('El producto indicado es un producto terminado, no una materia prima', 422);
  const [recepciones, consumos] = await Promise.all([
    consulta(
      database,
      `SELECT dr.id AS "detalleRecepcionId",dr.cantidad_recibida AS "cantidadRecibida",
        dr.fecha_vencimiento AS "fechaVencimiento",r.id AS "recepcionId",r.numero AS "recepcionNumero",
        r.fecha_recepcion AS "fechaRecepcion",r.estado AS "recepcionEstado",r.tiene_novedades AS "tieneNovedades",
        pr.id AS "proveedorId",pr.numero_documento AS "proveedorDocumento",
        pr.razon_social AS "proveedorRazonSocial",pr.nombre_comercial AS "proveedorNombreComercial",
        m.id AS "movimientoEntradaId",m.numero_documento AS "movimientoEntradaNumero"
      FROM detalles_recepcion dr JOIN recepciones r ON r.id=dr.recepcion_id
      JOIN proveedores pr ON pr.id=r.proveedor_id
      LEFT JOIN movimientos_inventario m ON m.origen='RECEPCION' AND m.origen_id=r.id AND m.estado='APLICADO'
      WHERE dr.producto_id=:productoId AND dr.lote_proveedor=:lote
        AND (:fechaVencimiento::date IS NULL OR dr.fecha_vencimiento=:fechaVencimiento)
      ORDER BY r.fecha_recepcion,r.numero,dr.id`,
      { productoId, lote, fechaVencimiento },
    ),
    consulta(
      database,
      `SELECT d.id AS "detalleMovimientoId",d.cantidad,d.fecha_vencimiento AS "fechaVencimiento",
        m.id AS "movimientoId",m.numero_documento AS "movimientoNumero",m.fecha AS "fechaConsumo",
        m.origen,m.origen_id AS "origenId",op.id AS "ordenProduccionId",op.numero AS "ordenNumero",
        op.estado AS "ordenEstado",op.fecha_inicio AS "fechaInicio",op.fecha_finalizacion AS "fechaFinalizacion",
        rp.id AS "resultadoProduccionId",rp.producto_terminado_id AS "productoTerminadoId",
        pt.codigo AS "productoTerminadoCodigo",pt.nombre AS "productoTerminadoNombre",
        rp.lote_pt AS "loteProductoTerminado",rp.cantidad_producida AS "cantidadProducida",
        rp.fecha_vencimiento_final AS "vencimientoProductoTerminado",u.simbolo AS "unidadConsumo",
        upt.simbolo AS "unidadProductoTerminado"
      FROM detalle_movimiento d JOIN movimientos_inventario m ON m.id=d.movimiento_inventario_id
      LEFT JOIN reportes_produccion rep ON m.origen='PRODUCCION_PARCIAL' AND rep.id=m.origen_id
      JOIN ordenes_produccion op ON op.id=CASE WHEN m.origen='OT' THEN m.origen_id ELSE rep.orden_produccion_id END
      JOIN resultados_produccion rp ON rp.orden_produccion_id=op.id
      JOIN productos pt ON pt.id=rp.producto_terminado_id
      JOIN unidades_medida u ON u.id=d.unidad_medida_id
      JOIN unidades_medida upt ON upt.id=rp.unidad_medida_id
      WHERE d.producto_id=:productoId AND COALESCE(d.lote,d.lote_proveedor)=:lote
        AND (:fechaVencimiento::date IS NULL OR d.fecha_vencimiento=:fechaVencimiento)
        AND d.sentido='SALIDA' AND m.estado='APLICADO'
        AND ((m.origen='OT' AND op.movimiento_pep_id IS NULL) OR m.origen='PRODUCCION_PARCIAL')
      ORDER BY m.fecha,op.numero,rp.lote_pt,d.id`,
      { productoId, lote, fechaVencimiento },
    ),
  ]);
  const afectadosPorResultado = new Map();
  const claves = new Set();
  for (const fila of consumos) {
    const clave = `${fila.detalleMovimientoId}|${fila.resultadoProduccionId}`;
    if (claves.has(clave)) continue;
    claves.add(clave);
    let afectado = afectadosPorResultado.get(fila.resultadoProduccionId);
    if (!afectado) {
      afectado = {
        resultadoProduccionId: fila.resultadoProduccionId,
        ordenProduccionId: fila.ordenProduccionId,
        ordenNumero: fila.ordenNumero,
        ordenEstado: fila.ordenEstado,
        fechaInicio: fila.fechaInicio,
        fechaFinalizacion: fila.fechaFinalizacion,
        productoTerminadoId: fila.productoTerminadoId,
        productoTerminadoCodigo: fila.productoTerminadoCodigo,
        productoTerminadoNombre: fila.productoTerminadoNombre,
        loteProductoTerminado: fila.loteProductoTerminado,
        cantidadProducida: numero(fila.cantidadProducida),
        vencimientoProductoTerminado: fila.vencimientoProductoTerminado,
        unidadConsumo: fila.unidadConsumo,
        unidadProductoTerminado: fila.unidadProductoTerminado,
        cantidadMateriaPrimaConsumida: 0,
        consumos: [],
      };
      afectadosPorResultado.set(fila.resultadoProduccionId, afectado);
    }
    const cantidad = numero(fila.cantidad);
    afectado.cantidadMateriaPrimaConsumida = Number(
      (afectado.cantidadMateriaPrimaConsumida + cantidad).toFixed(6),
    );
    afectado.consumos.push({
      detalleMovimientoId: fila.detalleMovimientoId,
      movimientoId: fila.movimientoId,
      movimientoNumero: fila.movimientoNumero,
      fechaConsumo: fila.fechaConsumo,
      origen: fila.origen,
      origenId: fila.origenId,
      cantidad,
      fechaVencimiento: fila.fechaVencimiento,
    });
  }
  const afectados = [...afectadosPorResultado.values()];
  const salidas = [];
  for (const resultado of afectados) {
    const adelante = await obtenerTrazabilidadAdelante(
      resultado.productoTerminadoId,
      resultado.loteProductoTerminado,
      resultado.vencimientoProductoTerminado,
      resultado.ordenProduccionId,
      database,
    );
    salidas.push({
      resultadoProduccionId: resultado.resultadoProduccionId,
      productoTerminadoId: resultado.productoTerminadoId,
      loteProductoTerminado: resultado.loteProductoTerminado,
      cantidadEntregada: adelante.cantidadEntregada,
      cantidadRestanteTotal: adelante.cantidadRestanteTotal,
      entregas: adelante.entregas,
    });
  }
  const advertencias = [];
  if (!recepciones.length) advertencias.push('No se encontró una recepción para la clave de materia prima consultada.');
  if (!afectados.length) advertencias.push('No se encontraron consumos de producción aplicados para la clave consultada.');
  if (recepciones.length > 1) advertencias.push('La clave de materia prima coincide con varias recepciones; no se adjudica un origen único.');
  return {
    metadata: {
      generadoEn: new Date().toISOString(),
      soloLectura: true,
      criterioLoteInventario: 'COALESCE(lote,loteProveedor)',
      devolucionesClienteSoportadas: false,
      advertencias,
    },
    materiaPrima: {
      ...producto[0],
      lote,
      fechaVencimiento,
    },
    recepciones: recepciones.map((x) => ({ ...x, cantidadRecibida: numero(x.cantidadRecibida) })),
    produccionAfectada: afectados,
    distribucionAfectada: salidas,
  };
};

const obtenerCalidad = async (ordenId, database) => {
  const inspecciones = await consulta(database, `SELECT i.id,i.estado,i.fecha_inspeccion AS "fechaInspeccion",
    i.fecha_inicio AS "fechaInicio",i.fecha_completada AS "fechaCompletada",i.fecha_cierre AS "fechaCierre",
    i.observaciones,i.producto_id AS "productoId",p.codigo AS "productoCodigo",p.nombre AS "productoNombre",
    i.lote,i.fecha_vencimiento AS "fechaVencimiento",f.id AS "formatoId",f.codigo AS "formatoCodigo",
    f.nombre AS "formatoNombre",vf.id AS "versionFormatoId",vf.numero_version AS "numeroVersion",
    ti.codigo AS "tipoInspeccionCodigo",ti.nombre AS "tipoInspeccionNombre",
    ini.id AS "iniciadaPorId",ini.nombre AS "iniciadaPorNombre",ini.correo AS "iniciadaPorCorreo",
    cie.id AS "cerradaPorId",cie.nombre AS "cerradaPorNombre",cie.correo AS "cerradaPorCorreo"
    FROM inspecciones i JOIN versiones_formato vf ON vf.id=i.version_formato_id
    JOIN formatos_calidad f ON f.id=vf.formato_calidad_id JOIN tipos_inspeccion ti ON ti.id=f.tipo_inspeccion_id
    LEFT JOIN productos p ON p.id=i.producto_id LEFT JOIN usuarios ini ON ini.id=i.iniciada_por
    LEFT JOIN usuarios cie ON cie.id=i.cerrada_por WHERE i.orden_produccion_id=:ordenId
    ORDER BY i.fecha_inicio,i.id`, { ordenId });
  if (!inspecciones.length) return [];
  const ids = inspecciones.map((x) => x.id);
  const [respuestas, checklists, desviaciones, acciones, seguimientos, evidencias, tareas] = await Promise.all([
    consulta(database, `SELECT ri.*,ri.inspeccion_id AS "inspeccionId",cf.codigo AS "campoCodigo",
      cf.etiqueta AS parametro,cf.valor_minimo AS "criterioMinimo",cf.valor_maximo AS "criterioMaximo",
      um.simbolo AS unidad,tc.codigo AS "tipoCampo",us.id AS "guardadoPorId",us.nombre AS "guardadoPorNombre",
      us.correo AS "guardadoPorCorreo" FROM respuestas_inspeccion ri
      JOIN campos_formato cf ON cf.id=ri.campo_formato_id JOIN tipos_campo tc ON tc.id=cf.tipo_campo_id
      LEFT JOIN unidades_medida um ON um.id=cf.unidad_medida_id LEFT JOIN usuarios us ON us.id=ri.guardado_por
      WHERE ri.inspeccion_id IN (:ids) ORDER BY ri.fecha_guardado,ri.id`, { ids }),
    consulta(database, `SELECT rc.*,rc.inspeccion_id AS "inspeccionId",ei.codigo AS "elementoCodigo",
      ei.nombre AS elemento,ci.codigo AS "criterioCodigo",ci.nombre AS criterio,ci.pregunta,
      ci.resultado_esperado AS "resultadoEsperado",us.id AS "guardadoPorId",us.nombre AS "guardadoPorNombre",
      us.correo AS "guardadoPorCorreo" FROM respuestas_elemento_checklist rc
      JOIN elementos_inspeccion ei ON ei.id=rc.elemento_inspeccion_id
      JOIN criterios_inspeccion ci ON ci.id=rc.criterio_inspeccion_id LEFT JOIN usuarios us ON us.id=rc.guardado_por
      WHERE rc.inspeccion_id IN (:ids) ORDER BY rc.fecha_guardado,rc.id`, { ids }),
    consulta(database, `SELECT d.*,d.inspeccion_id AS "inspeccionId",ns.codigo AS "severidadCodigo",
      ns.nombre AS "severidadNombre",us.id AS "detectadaPorId",us.nombre AS "detectadaPorNombre",
      us.correo AS "detectadaPorCorreo" FROM desviaciones d LEFT JOIN niveles_severidad ns ON ns.id=d.nivel_severidad_id
      LEFT JOIN usuarios us ON us.id=d.detectada_por WHERE d.inspeccion_id IN (:ids)
      ORDER BY d.fecha_deteccion,d.id`, { ids }),
    consulta(database, `SELECT ac.*,ac.desviacion_id AS "desviacionId",ta.codigo AS "tipoAccionCodigo",
      ta.nombre AS "tipoAccionNombre",us.id AS "responsableUsuarioId",us.nombre AS "responsableNombre",
      us.correo AS "responsableCorreo" FROM acciones_correctivas ac JOIN tipos_accion ta ON ta.id=ac.tipo_accion_id
      LEFT JOIN usuarios us ON us.id=ac.responsable_id WHERE ac.desviacion_id IN
      (SELECT id FROM desviaciones WHERE inspeccion_id IN (:ids)) ORDER BY ac.fecha_asignacion,ac.id`, { ids }),
    consulta(database, `SELECT s.*,s.accion_correctiva_id AS "accionCorrectivaId",u.simbolo AS unidad,
      us.id AS "registradoPorId",us.nombre AS "registradoPorNombre",us.correo AS "registradoPorCorreo"
      FROM seguimientos_accion_correctiva s LEFT JOIN unidades_medida u ON u.id=s.unidad_medida_id
      LEFT JOIN usuarios us ON us.id=s.registrado_por WHERE s.accion_correctiva_id IN
      (SELECT ac.id FROM acciones_correctivas ac JOIN desviaciones d ON d.id=ac.desviacion_id WHERE d.inspeccion_id IN (:ids))
      ORDER BY s.fecha_registro,s.id`, { ids }),
    consulta(database, `SELECT e.*,e.accion_correctiva_id AS "accionCorrectivaId",e.seguimiento_accion_correctiva_id AS "seguimientoId",
      e.tarea_accion_correctiva_id AS "tareaId",us.id AS "subidoPorId",us.nombre AS "subidoPorNombre",
      us.correo AS "subidoPorCorreo" FROM evidencias_accion_correctiva e LEFT JOIN usuarios us ON us.id=e.subido_por
      WHERE e.accion_correctiva_id IN (SELECT ac.id FROM acciones_correctivas ac JOIN desviaciones d ON d.id=ac.desviacion_id
      WHERE d.inspeccion_id IN (:ids)) ORDER BY e.fecha_carga,e.id`, { ids }),
    consulta(database, `SELECT t.*,t.accion_correctiva_id AS "accionCorrectivaId",us.id AS "asignadoId",
      us.nombre AS "asignadoNombre",us.correo AS "asignadoCorreo" FROM tareas_accion_correctiva t
      LEFT JOIN usuarios us ON us.id=t.usuario_asignado_id WHERE t.accion_correctiva_id IN
      (SELECT ac.id FROM acciones_correctivas ac JOIN desviaciones d ON d.id=ac.desviacion_id WHERE d.inspeccion_id IN (:ids))`, { ids }),
  ]);
  return inspecciones.map((inspeccion) => {
    const desv = desviaciones.filter((x) => x.inspeccionId === inspeccion.id);
    return {
      ...inspeccion,
      iniciadaPor: usuario(inspeccion.iniciadaPorId, inspeccion.iniciadaPorNombre, inspeccion.iniciadaPorCorreo),
      cerradaPor: usuario(inspeccion.cerradaPorId, inspeccion.cerradaPorNombre, inspeccion.cerradaPorCorreo),
      resultadoConsolidado: ['CERRADA', 'CERRADA_INCOMPLETA'].includes(inspeccion.estado)
        ? desv.length ? 'NO_CUMPLE' : 'CUMPLE' : 'PENDIENTE',
      respuestas: respuestas.filter((x) => x.inspeccionId === inspeccion.id).map((x) => ({
        ...x,
        criterioMinimo: numero(x.criterioMinimo), criterioMaximo: numero(x.criterioMaximo),
        guardadoPor: usuario(x.guardadoPorId, x.guardadoPorNombre, x.guardadoPorCorreo),
      })),
      checklists: checklists.filter((x) => x.inspeccionId === inspeccion.id).map((x) => ({
        ...x, guardadoPor: usuario(x.guardadoPorId, x.guardadoPorNombre, x.guardadoPorCorreo),
      })),
      desviaciones: desv.map((d) => ({
        ...d,
        detectadaPor: usuario(d.detectadaPorId, d.detectadaPorNombre, d.detectadaPorCorreo),
        accionesCorrectivas: acciones.filter((a) => a.desviacionId === d.id).map((a) => ({
          ...a,
          responsable: usuario(a.responsableUsuarioId, a.responsableNombre, a.responsableCorreo),
          tarea: tareas.find((t) => t.accionCorrectivaId === a.id) || null,
          seguimientos: seguimientos.filter((s) => s.accionCorrectivaId === a.id),
          evidencias: evidencias.filter((e) => e.accionCorrectivaId === a.id),
        })),
      })),
    };
  });
};

const resumenCalidad = (inspecciones) => {
  const resumen = { conformes: 0, noConformes: 0, pendientes: 0, sinInformacion: 0 };
  if (!inspecciones.length) resumen.sinInformacion = 1;
  for (const inspeccion of inspecciones) {
    if (inspeccion.resultadoConsolidado === 'CUMPLE') resumen.conformes += 1;
    else if (inspeccion.resultadoConsolidado === 'NO_CUMPLE') resumen.noConformes += 1;
    else resumen.pendientes += 1;
  }
  return resumen;
};

const obtenerInforme = async (lote, filtros = {}, database = sequelize) => {
  const cabeceras = await obtenerCabeceras(lote, filtros, database);
  if (!cabeceras.length) throw new ApiError('Lote de producto terminado no encontrado', 404);
  if (cabeceras.length > 1) {
    throw new ApiError('El lote coincide con más de un producto u orden; especifique productoId u ordenProduccionId', 409, {
      coincidencias: cabeceras.map((x) => ({ ordenProduccionId: x.ordenProduccionId, ordenNumero: x.ordenNumero, productoId: x.productoId, productoCodigo: x.productoCodigo })),
    });
  }
  const c = cabeceras[0];
  const esParcial = Boolean(c.movimientoPepId);
  const [consumosRaw, mermasRaw, parcialesRaw, movimientosPt, calidad, trazabilidadAdelante] = await Promise.all([
    obtenerConsumos(c.ordenProduccionId, esParcial, database),
    obtenerMermas(c.ordenProduccionId, database),
    obtenerParciales(c.ordenProduccionId, database),
    obtenerMovimientosPt(c.productoId, c.lote, c.ordenProduccionId, database),
    obtenerCalidad(c.ordenProduccionId, database),
    obtenerTrazabilidadAdelante(
      c.productoId,
      c.lote,
      c.fechaVencimientoFinal,
      c.ordenProduccionId,
      database,
    ),
  ]);
  const vinculos = await obtenerRecepcionesOrigen(consumosRaw, database);
  const recepcionIds = [...new Set(vinculos.flatMap((x) => x.recepciones.map((r) => r.recepcionId)))];
  const controlesRecepcion = await obtenerControlesRecepcion(recepcionIds, database);
  const consumos = consumosRaw.map((x) => ({ ...x, cantidad: numero(x.cantidad), trazabilidadRecepcion: vinculos.find((v) => v.detalleMovimientoId === x.detalleMovimientoId) }));
  const mermas = mermasRaw.map((x) => ({ ...x, cantidad: numero(x.cantidad), responsable: usuario(x.usuarioId, x.usuarioNombre, x.usuarioCorreo) }));
  const parciales = parcialesRaw.map((x) => ({ ...x, cantidad: numero(x.cantidad), responsable: usuario(x.usuarioId, x.usuarioNombre, x.usuarioCorreo) }));
  const advertencias = [];
  if (!consumos.length) advertencias.push('No se encontraron movimientos de consumo aplicados para la orden.');
  if (vinculos.some((x) => x.estadoVinculo === 'AMBIGUO')) advertencias.push('Una o más materias primas tienen varias recepciones candidatas para la misma clave de inventario.');
  if (vinculos.some((x) => x.estadoVinculo === 'NO_ENCONTRADO')) advertencias.push('Una o más materias primas no pudieron vincularse con una recepción terminada.');
  if (!calidad.length) advertencias.push('La orden no tiene inspecciones del motor de Calidad.');
  return {
    metadata: { generadoEn: new Date().toISOString(), soloLectura: true, criterioLoteInventario: 'COALESCE(lote,loteProveedor)', advertencias },
    identificacion: {
      lote: c.lote,
      producto: { id: c.productoId, codigo: c.productoCodigo, nombre: c.productoNombre, descripcion: c.productoDescripcion },
      ordenProduccion: { id: c.ordenProduccionId, numero: c.ordenNumero, estado: c.estadoOrden, fecha: c.fechaOrden, fechaInicio: c.fechaInicio, fechaSalidaMateriasPrimas: c.fechaSalidaMp, fechaFinalizacion: c.fechaFinalizacion, observaciones: c.ordenObservaciones, modalidad: esParcial ? 'PARCIAL_PEP' : 'CONVENCIONAL' },
      cantidadPlaneada: numero(c.cantidadPlaneada), cantidadProducida: numero(c.cantidadProducida),
      unidadMedida: { id: c.unidadMedidaId, codigo: c.unidadCodigo, nombre: c.unidadNombre, simbolo: c.unidadSimbolo },
      fechaVencimientoSugerida: c.fechaVencimientoSugerida, fechaVencimientoFinal: c.fechaVencimientoFinal,
      bodegaDestino: c.bodegaDestinoId ? { id: c.bodegaDestinoId, codigo: c.bodegaDestinoCodigo, nombre: c.bodegaDestinoNombre } : null,
      responsables: { orden: usuario(c.responsableId, c.responsableNombre, c.responsableCorreo), inicio: usuario(c.usuarioInicioId, c.usuarioInicioNombre, c.usuarioInicioCorreo), salidaMateriasPrimas: usuario(c.usuarioSalidaId, c.usuarioSalidaNombre, c.usuarioSalidaCorreo), finalizacion: usuario(c.usuarioFinalizacionId, c.usuarioFinalizacionNombre, c.usuarioFinalizacionCorreo) },
    },
    trazabilidadMateriasPrimas: { consumos, controlesRecepcion },
    procesoProduccion: { modalidad: esParcial ? 'PARCIAL_PEP' : 'CONVENCIONAL', reportesParciales: parciales, mermas },
    calidad: { resumen: resumenCalidad(calidad), inspecciones: calidad },
    movimientosProductoTerminado: movimientosPt.map((x) => ({ ...x, cantidad: numero(x.cantidad) })),
    trazabilidadHaciaAdelante: trazabilidadAdelante,
  };
};

module.exports = {
  buscarLotes,
  obtenerInforme,
  obtenerTrazabilidadInversa,
  resumenCalidad,
};
