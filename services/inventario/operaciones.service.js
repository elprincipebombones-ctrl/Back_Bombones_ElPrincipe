const { QueryTypes } = require('sequelize');
const { createHash, randomUUID } = require('crypto');
const models = require('../../models');
const { sequelize: db } = models;
const error = (message, status = 422) => Object.assign(new Error(message), { status });
const texto = (value) => (typeof value === 'string' ? value.trim() || null : null);
function miles(value, signed = false) {
  if (
    !['string', 'number'].includes(typeof value) ||
    !(signed ? /^-?\d{1,12}(\.\d{1,3})?$/ : /^\d{1,12}(\.\d{1,3})?$/).test(String(value))
  )
    throw error('Cantidad inválida: máximo 12 enteros y 3 decimales');
  const s = String(value),
    negativo = s.startsWith('-');
  const [entero, decimal = ''] = s.replace('-', '').split('.');
  return (BigInt(entero) * 1000n + BigInt(decimal.padEnd(3, '0'))) * (negativo ? -1n : 1n);
}
const decimal = (n) =>
  `${n < 0n ? '-' : ''}${(n < 0n ? -n : n) / 1000n}.${String((n < 0n ? -n : n) % 1000n).padStart(3, '0')}`;
async function bodegas(ids, transaction) {
  const unicos = [...new Set(ids)].sort();
  const rows = await models.Bodega.findAll({
    where: { id: unicos },
    order: [['id', 'ASC']],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (rows.length !== unicos.length || rows.some((b) => !b.estado))
    throw error('Una bodega no existe o está inactiva');
}
async function saldo(bodegaId, linea, transaction) {
  const [r] = await db.query(
    `WITH d AS (
    SELECT d.*,m.estado,m.fecha,m.tipo_documento,
      CASE WHEN m.tipo_documento='EN' THEN 1 WHEN m.tipo_documento='SA' THEN -1 WHEN d.sentido='ENTRADA' THEN 1 WHEN d.sentido='SALIDA' THEN -1 ELSE 0 END AS signo
    FROM detalle_movimiento d JOIN movimientos_inventario m ON m.id=d.movimiento_inventario_id
    WHERE m.bodega_id=:bodegaId AND d.producto_id=:productoId AND d.unidad_medida_id=:unidadMedidaId
      AND m.estado='APLICADO' AND m.fecha<=clock_timestamp()
    ) SELECT COALESCE(SUM(cantidad*signo) FILTER (WHERE COALESCE(lote,lote_proveedor,'')=COALESCE(:lote,'') AND fecha_vencimiento IS NOT DISTINCT FROM :fechaVencimiento::date),0)::text AS saldo,
      COUNT(*) FILTER (WHERE signo=0)::int AS pendientes,
      md5(COALESCE(string_agg(id::text||':'||cantidad::text||':'||signo::text||':'||fecha::text,',' ORDER BY id)
        FILTER (WHERE COALESCE(lote,lote_proveedor,'')=COALESCE(:lote,'') AND fecha_vencimiento IS NOT DISTINCT FROM :fechaVencimiento::date),'')) AS huella
    FROM d`,
    {
      replacements: {
        bodegaId,
        productoId: linea.productoId,
        unidadMedidaId: linea.unidadMedidaId,
        lote: linea.lote || null,
        fechaVencimiento: linea.fechaVencimiento || null,
      },
      type: QueryTypes.SELECT,
      transaction,
    },
  );
  if (r.pendientes)
    throw error(
      'Existen ajustes o traslados históricos sin sentido; clasifíquelos antes de operar este producto',
      409,
    );
  return { cantidad: miles(r.saldo, true), huella: r.huella };
}
async function preparar(detalles, tipo, transaction) {
  if (!Array.isArray(detalles) || !detalles.length || detalles.length > 500)
    throw error('Se requieren entre 1 y 500 detalles');
  const productos = await models.Producto.findAll({
    where: { id: [...new Set(detalles.map((d) => d.productoId))] },
    include: [{ model: models.CategoriaProducto, as: 'categoriaProducto' }],
    transaction,
  });
  const porId = new Map(productos.map((p) => [p.id, p]));
  const vistos = new Set();
  return detalles.map((d) => {
    const p = porId.get(d.productoId);
    if (!p?.estado) throw error('Un producto no existe o está inactivo');
    const lote = texto(d.lote),
      fechaVencimiento = d.fechaVencimiento || null;
    if (p.categoriaProducto?.requiereLote && !lote)
      throw error(`El producto ${p.codigo} requiere lote`);
    if (p.categoriaProducto?.requiereFechaVencimiento && !fechaVencimiento)
      throw error(`El producto ${p.codigo} requiere fecha de vencimiento`);
    const key = JSON.stringify([
      p.id,
      lote,
      fechaVencimiento,
      tipo === 'TRASLADO' ? d.bodegaDestinoId : null,
    ]);
    if (vistos.has(key)) throw error('Detalle duplicado: producto, lote, vencimiento y destino');
    vistos.add(key);
    const cantidad = miles(tipo === 'CONTEO' ? d.cantidadContada : d.cantidad);
    if (tipo === 'TRASLADO' && cantidad <= 0n)
      throw error('La cantidad a trasladar debe ser positiva');
    return {
      productoId: p.id,
      unidadMedidaId: p.unidadMedidaId,
      lote,
      fechaVencimiento,
      bodegaDestinoId: tipo === 'TRASLADO' ? d.bodegaDestinoId : null,
      cantidadContada: tipo === 'CONTEO' ? decimal(cantidad) : null,
      cantidad: decimal(cantidad),
    };
  });
}
async function obtener(id, transaction) {
  const op = await models.OperacionInventario.findByPk(id, {
    include: [
      { model: models.Bodega, as: 'bodega' },
      {
        model: models.LineaOperacionInventario,
        as: 'detalles',
        include: [{ model: models.Producto, as: 'producto' }],
      },
      { model: models.MovimientoInventario, as: 'documentos' },
    ],
    transaction,
  });
  if (!op) throw error('Operación no encontrada', 404);
  return op;
}
async function guardarConteo(body, usuarioId, id) {
  return db.transaction(async (transaction) => {
    let op;
    if (id) {
      op = await models.OperacionInventario.findByPk(id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!op || op.tipo !== 'CONTEO') throw error('Conteo no encontrado', 404);
      if (op.estado !== 'BORRADOR') throw error('Sólo se puede editar un conteo en borrador', 409);
      if (body.bodegaId && body.bodegaId !== op.bodegaId)
        throw error('No se puede cambiar la bodega de un conteo');
    }
    const bodegaId = op?.bodegaId || body.bodegaId;
    await bodegas([bodegaId], transaction);
    const lineas = await preparar(body.detalles, 'CONTEO', transaction);
    if (!op)
      op = await models.OperacionInventario.create(
        { tipo: 'CONTEO', bodegaId, usuarioId, nota: texto(body.nota) },
        { transaction },
      );
    else {
      await op.update(
        { nota: body.nota === undefined ? op.nota : texto(body.nota) },
        { transaction },
      );
      await models.LineaOperacionInventario.destroy({ where: { operacionId: op.id }, transaction });
    }
    for (const linea of lineas) {
      const actual = await saldo(bodegaId, linea, transaction);
      const ajuste = miles(linea.cantidadContada) - actual.cantidad;
      miles(decimal(ajuste), true);
      await models.LineaOperacionInventario.create(
        {
          ...linea,
          operacionId: op.id,
          cantidadSistema: decimal(actual.cantidad),
          cantidad: decimal(ajuste),
          huella: actual.huella,
        },
        { transaction },
      );
    }
    return obtener(op.id, transaction);
  });
}
async function documento(op, lineas, tipoDocumento, bodegaId, usuarioId, transaction) {
  const [[r]] = await db.query("SELECT nextval('inventario_documento_seq') AS numero", {
    transaction,
  });
  const mov = await models.MovimientoInventario.create(
    {
      operacionId: op.id,
      tipoDocumento,
      numeroDocumento: `${tipoDocumento}-INV-${r.numero}`,
      fecha: new Date(),
      bodegaId,
      estado: 'APLICADO',
      origen: op.tipo === 'CONTEO' ? 'AJUSTE_CONTEO' : 'TRASLADO',
      origenId: randomUUID(),
      usuarioId,
      observaciones: op.nota,
    },
    { transaction },
  );
  await models.DetalleMovimiento.bulkCreate(
    lineas.map((l) => ({
      movimientoInventarioId: mov.id,
      productoId: l.productoId,
      unidadMedidaId: l.unidadMedidaId,
      cantidad: decimal(
        miles(l.cantidad, true) < 0n ? -miles(l.cantidad, true) : miles(l.cantidad, true),
      ),
      sentido: tipoDocumento === 'EN' ? 'ENTRADA' : 'SALIDA',
      lote: l.lote,
      loteProveedor: l.lote,
      fechaVencimiento: l.fechaVencimiento,
      observaciones: op.nota,
    })),
    { transaction },
  );
  return mov;
}
async function aplicarConteo(id, nota, usuarioId) {
  return db.transaction(async (transaction) => {
    const op = await models.OperacionInventario.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!op || op.tipo !== 'CONTEO') throw error('Conteo no encontrado', 404);
    if (op.estado === 'APLICADO') return obtener(id, transaction);
    if (op.estado !== 'BORRADOR') throw error('Conteo anulado', 409);
    const motivo = texto(nota) || texto(op.nota);
    if (!motivo) throw error('La nota del ajuste es obligatoria');
    await bodegas([op.bodegaId], transaction);
    const lineas = await models.LineaOperacionInventario.findAll({
      where: { operacionId: id },
      transaction,
    });
    const productos = await models.Producto.count({
      where: { id: [...new Set(lineas.map((l) => l.productoId))], estado: true },
      transaction,
    });
    if (productos !== new Set(lineas.map((l) => l.productoId)).size)
      throw error('Un producto del conteo está inactivo');
    for (const l of lineas) {
      const actual = await saldo(op.bodegaId, l, transaction);
      if (actual.huella !== l.huella || actual.cantidad !== miles(l.cantidadSistema, true))
        throw error(
          'Las existencias cambiaron desde el conteo; vuelva a contar y guardar antes de aplicar',
          409,
        );
    }
    await op.update({ nota: motivo }, { transaction });
    const entradas = lineas.filter((l) => miles(l.cantidad, true) > 0n),
      salidas = lineas.filter((l) => miles(l.cantidad, true) < 0n);
    if (entradas.length) await documento(op, entradas, 'EN', op.bodegaId, usuarioId, transaction);
    if (salidas.length) await documento(op, salidas, 'SA', op.bodegaId, usuarioId, transaction);
    await op.update(
      { estado: 'APLICADO', aplicadoPor: usuarioId, aplicadoEn: new Date() },
      { transaction },
    );
    return obtener(id, transaction);
  });
}
async function trasladar(body, usuarioId) {
  const hash = createHash('sha256')
    .update(
      JSON.stringify({ bodegaId: body.bodegaId, nota: texto(body.nota), detalles: body.detalles }),
    )
    .digest('hex');
  return db.transaction(async (transaction) => {
    await db.query('SELECT pg_advisory_xact_lock(hashtextextended(:key,0))', {
      replacements: { key: body.idempotencia },
      transaction,
    });
    const previo = await models.OperacionInventario.findOne({
      where: { idempotencia: body.idempotencia },
      transaction,
    });
    if (previo) {
      if (previo.solicitudHash !== hash || previo.usuarioId !== usuarioId)
        throw error('La clave de idempotencia ya corresponde a otra solicitud', 409);
      return obtener(previo.id, transaction);
    }
    if (!Array.isArray(body.detalles) || !body.detalles.length)
      throw error('Se requieren detalles');
    if (body.detalles.some((d) => d.bodegaDestinoId === body.bodegaId))
      throw error('La bodega origen debe ser diferente de cada destino');
    await bodegas([body.bodegaId, ...body.detalles.map((d) => d.bodegaDestinoId)], transaction);
    const lineas = await preparar(body.detalles, 'TRASLADO', transaction);
    const acumulado = new Map();
    for (const l of lineas) {
      const actual = await saldo(body.bodegaId, l, transaction);
      const key = JSON.stringify([l.productoId, l.unidadMedidaId, l.lote, l.fechaVencimiento]);
      const solicitado = (acumulado.get(key) || 0n) + miles(l.cantidad);
      if (solicitado > actual.cantidad)
        throw error(
          'Existencias insuficientes en la bodega origen para el producto/lote seleccionado',
          409,
        );
      acumulado.set(key, solicitado);
      l.cantidadSistema = decimal(actual.cantidad);
      l.huella = actual.huella;
      // A destination with unresolved history must also be reconciled first.
      await saldo(l.bodegaDestinoId, l, transaction);
    }
    const op = await models.OperacionInventario.create(
      {
        tipo: 'TRASLADO',
        bodegaId: body.bodegaId,
        usuarioId,
        nota: texto(body.nota),
        idempotencia: body.idempotencia,
        solicitudHash: hash,
      },
      { transaction },
    );
    await models.LineaOperacionInventario.bulkCreate(
      lineas.map((l) => ({ ...l, operacionId: op.id })),
      { transaction },
    );
    await documento(op, lineas, 'SA', body.bodegaId, usuarioId, transaction);
    for (const destino of [...new Set(lineas.map((l) => l.bodegaDestinoId))].sort())
      await documento(
        op,
        lineas.filter((l) => l.bodegaDestinoId === destino),
        'EN',
        destino,
        usuarioId,
        transaction,
      );
    await op.update(
      { estado: 'APLICADO', aplicadoPor: usuarioId, aplicadoEn: new Date() },
      { transaction },
    );
    return obtener(op.id, transaction);
  });
}
async function listar(query, tipo) {
  const pagina = Number(query.pagina || 1),
    limite = Number(query.limite || 50);
  const where = { tipo };
  if (query.bodegaId) where.bodegaId = query.bodegaId;
  if (query.estado) where.estado = query.estado;
  const { rows, count } = await models.OperacionInventario.findAndCountAll({
    where,
    order: [
      ['createdAt', 'DESC'],
      ['id', 'ASC'],
    ],
    offset: (pagina - 1) * limite,
    limit: limite,
  });
  return { filas: rows, total: count, pagina, limite };
}
async function anularConteo(id) {
  return db.transaction(async (transaction) => {
    const op = await models.OperacionInventario.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!op || op.tipo !== 'CONTEO') throw error('Conteo no encontrado', 404);
    if (op.estado === 'APLICADO')
      throw error('Un conteo aplicado no se puede anular; registre un nuevo conteo', 409);
    await op.update({ estado: 'ANULADO' }, { transaction });
    return op;
  });
}
module.exports = {
  guardarConteo,
  aplicarConteo,
  trasladar,
  obtener,
  listar,
  anularConteo,
  saldo,
  miles,
  decimal,
};
