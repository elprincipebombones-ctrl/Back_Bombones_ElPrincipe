const catalogos = {
  categoriaProducto: { secuencia: 'categorias_productos_codigo_seq', prefijo: 'CP' },
  bodega: { secuencia: 'bodegas_codigo_seq', prefijo: 'BD' },
};

const siguienteCodigoMaestro = async (catalogo, database, transaction) => {
  const configuracion = catalogos[catalogo];
  if (!configuracion) throw new Error('Catálogo sin configuración de código interno');
  const [[fila]] = await database.query('SELECT nextval(:secuencia)::text AS consecutivo', {
    replacements: { secuencia: configuracion.secuencia },
    transaction,
  });
  return `${configuracion.prefijo}-${String(fila.consecutivo).padStart(6, '0')}`;
};

module.exports = { siguienteCodigoMaestro };
