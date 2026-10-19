// Este módulo consume exclusivamente el DTO existente y organiza su presentación.
function presentar(reporte, origen, bloques) {
  const { texto, cantidad, fecha } = reporte;
  const c = (clave, titulo, ancho = 1, extra = {}) => ({ clave, titulo, ancho, ...extra });
  const producto = (r) => [r.producto_codigo, r.producto].filter(Boolean).join('\n');
  const q = (clave) => (r) => cantidad(r[clave], r.unidad);
  const unidos = (...valores) =>
    valores.filter((v) => v !== null && v !== undefined && v !== '').join('\n') || '—';
  const distintos = (filas, clave) => new Set(filas.map((r) => r[clave]).filter(Boolean)).size;
  const pt = [...bloques.produccion, ...bloques.parciales, ...bloques.ventas, ...bloques.despachos];
  const mp = [...bloques.materiasPrimas];
  if (origen.tipo === 'pt') pt.push({ producto_codigo: origen.codigo });
  if (origen.tipo === 'mp') mp.push({ producto_codigo: origen.codigo });
  reporte.tarjetaResumen('Resumen de trazabilidad', origen, { destacada: true, nivel: 1 });
  reporte.indicadores({
    'Productos PT': distintos(pt, 'producto_codigo'),
    'MP relacionadas': distintos(mp, 'producto_codigo'),
    Inspecciones: distintos(bloques.calidad, 'id'),
    Despachos: distintos(bloques.despachos, 'despacho'),
  });
  reporte.cronologia(bloques.cronologia);

  reporte.seccion('Recepciones y proveedores');
  const recepcionCols = [
    c('fecha', 'Fecha', 1.1),
    c('recepcion', 'Recepción', 1.1),
    c('proveedor', 'Proveedor', 1.4),
    c('producto', 'Producto', 1.8, { valor: producto }),
    c('lote', 'Lote', 1),
    c('cantidad_recibida', 'Cantidad', 0.9, { valor: q('cantidad_recibida') }),
    c('fecha_vencimiento', 'Vencimiento', 1),
    c('bodega', 'Bodega', 1.3),
    c('resultado', 'Resultado', 1, { estado: true }),
  ];
  if (!bloques.recepcion.length) reporte.sinInformacion();
  bloques.recepcion.forEach((r) => {
    reporte.tabla(recepcionCols, [r]);
    const controles = [
      'estado',
      'lote_proveedor',
      'certificado_calidad',
      'plagas',
      'rotulado_correcto',
      'condiciones_embalaje',
      'apariencia_color_textura',
      'empaque_embalaje',
      'olor',
      'temperaturas',
      'observaciones',
    ];
    const datos = Object.fromEntries(
      controles
        .filter((k) => r[k] !== null && r[k] !== undefined && r[k] !== '')
        .map((k) => [
          k,
          k === 'temperaturas'
            ? String(r[k]).replace(/(-?\d+\.\d+)\s*/g, (_, n) => `${cantidad(n)} `)
            : r[k],
        ]),
    );
    if (Object.keys(datos).length)
      reporte.tarjetaResumen(`Controles · ${r.recepcion} · lote ${texto(r.lote)}`, datos, {
        columnas: 3,
      });
  });

  reporte.seccion('Inventario');
  reporte.tabla(
    [
      c('fecha', 'Fecha', 1.2),
      c('documento', 'Documento', 1.1),
      c('tipo_documento', 'Tipo', 0.8),
      c('producto', 'Producto', 1.8, { valor: producto }),
      c('lote', 'Lote'),
      c('bodega', 'Bodega', 1.2),
      c('cantidad', 'Cantidad', 1, { valor: q('cantidad') }),
      c('sentido', 'Sentido', 0.8),
      c('estado', 'Estado', 0.9, { estado: true }),
      c('origen', 'Origen / referencia', 1.2, {
        valor: (r) => unidos(r.origen, r.referencia_origen),
      }),
    ],
    bloques.inventario,
  );

  reporte.seccion('Producción y lotes PT');
  reporte.tabla(
    [
      c('ot', 'OT'),
      c('producto', 'Producto PT', 1.8, { valor: producto }),
      c('lote', 'Lote PT'),
      c('cantidad_planeada', 'Planeado', 1, { valor: q('cantidad_planeada') }),
      c('cantidad_producida', 'Producido', 1, { valor: q('cantidad_producida') }),
      c('estado', 'Estado', 1.1, { estado: true }),
      c('fecha', 'Fechas', 1.5, {
        valor: (r) =>
          `Documento\n${fecha(r.fecha)}\nInicio\n${fecha(r.fecha_inicio)}\nFinalización\n${fecha(r.fecha_finalizacion)}`,
      }),
      c('fecha_vencimiento', 'Vencimiento'),
      c('bodega', 'Bodega', 1.2),
    ],
    bloques.produccion,
  );

  reporte.seccion('Parciales producidos');
  reporte.tabla(
    [
      c('fecha', 'Fecha', 1.3),
      c('ot', 'OT'),
      c('producto', 'Producto PT', 2, { valor: producto }),
      c('lote', 'Lote'),
      c('cantidad', 'Cantidad', 1, { valor: q('cantidad') }),
      c('usuario', 'Usuario', 1.3),
      c('salida_pep', 'Salida PEP'),
      c('entrada_pt', 'Entrada PT'),
    ],
    bloques.parciales,
  );

  reporte.seccion('Materias primas utilizadas');
  // Se conservan etapas y sentidos reales: no se atribuyen mermas sin lote ni se suman
  // las dos caras de un traslado como si fueran consumos diferentes.
  reporte.tabla(
    [
      c('ot', 'OT'),
      c('producto', 'Materia prima', 1.8, { valor: producto }),
      c('lote', 'Lote'),
      c('etapa', 'Etapa', 1.2),
      c('cantidad', 'Cantidad', 0.9, { valor: q('cantidad') }),
      c('sentido', 'Sentido', 0.8),
      c('bodega', 'Bodega', 1.2),
      c('documento', 'Documento', 1.1),
      c('fecha', 'Fecha', 1.2),
    ],
    bloques.materiasPrimas,
  );

  reporte.seccion('Adicionales y devoluciones');
  reporte.tabla(
    [
      c('ot', 'OT'),
      c('tipo', 'Tipo'),
      c('producto', 'Producto', 1.6, { valor: producto }),
      c('lote', 'Lote'),
      c('cantidad', 'Cantidad', 0.9, { valor: q('cantidad') }),
      c('estado', 'Estado', 1, { estado: true }),
      c('bodegas', 'Origen / destino', 1.4, {
        valor: (r) => unidos(r.bodega_origen, r.bodega_destino),
      }),
      c('fechas', 'Solicitud / aprobación', 1.3, {
        valor: (r) => unidos(fecha(r.fecha), fecha(r.fecha_aprobacion)),
      }),
      c('personas', 'Solicitante / aprobador', 1.3, {
        valor: (r) => unidos(r.solicitante, r.aprobador),
      }),
      c('motivo', 'Motivo / observación', 1.6, { valor: (r) => unidos(r.motivo, r.observacion) }),
    ],
    bloques.solicitudes,
  );

  reporte.seccion('Mermas');
  reporte.tabla(
    [
      c('fecha', 'Fecha', 1.3),
      c('ot', 'OT'),
      c('tipo', 'Tipo', 0.6),
      c('producto', 'Producto', 1.7, { valor: producto }),
      c('cantidad', 'Cantidad', 1, { valor: q('cantidad') }),
      c('motivo', 'Motivo', 1.5),
      c('observacion', 'Observación', 1.8),
      c('usuario', 'Usuario', 1.2),
    ],
    bloques.mermas,
  );

  reporte.seccion('Calidad y PCC');
  reporte.tabla(
    [
      c('formato', 'Formato', 1.6, {
        valor: (r) => unidos(r.formato, r.nombre_formato, `Versión ${texto(r.version)}`),
      }),
      c('fecha', 'Fecha', 1.2),
      c('producto', 'Producto / lote', 1.8, { valor: (r) => unidos(producto(r), r.lote, r.ot) }),
      c('estado', 'Estado', 1, { estado: true }),
      c('resultado', 'Resultado', 1.6),
      c('acciones_correctivas', 'Acciones', 0.7),
      c('responsable', 'Responsable', 1.2),
      c('observaciones', 'Observaciones', 1.5),
    ],
    bloques.calidad,
  );

  reporte.seccion('Pedidos y clientes');
  reporte.tabla(
    [
      c('pedido', 'Pedido'),
      c('cliente', 'Cliente', 1.5),
      c('fecha', 'Fecha', 1.3),
      c('producto', 'Producto', 2, { valor: producto }),
      c('cantidad', 'Cantidad', 1, { valor: q('cantidad') }),
      c('estado', 'Estado', 1.2, { estado: true }),
    ],
    bloques.ventas,
  );

  reporte.seccion('Despachos');
  reporte.tabla(
    [
      c('despacho', 'Despacho'),
      c('fecha', 'Fecha', 1.2),
      c('pedido', 'Pedido'),
      c('cliente', 'Cliente', 1.4),
      c('producto', 'Producto', 1.8, { valor: producto }),
      c('lote', 'Lote'),
      c('cantidad', 'Cantidad', 0.9, { valor: q('cantidad') }),
      c('bodega', 'Bodega', 1.2),
      c('movimiento_sa', 'Movimiento SA'),
      c('vehiculo', 'Vehículo'),
    ],
    bloques.despachos,
  );
}

module.exports = { presentar };
