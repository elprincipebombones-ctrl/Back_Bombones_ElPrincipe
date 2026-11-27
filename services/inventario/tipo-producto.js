const TIPOS_PRODUCTO = ['MP', 'PT', 'INSUMO', 'EMPAQUE', 'MATERIA_PRIMA', 'PRODUCTO_TERMINADO'];

function tipoProducto(valor) {
  if (!valor) return null;
  const tipo = { MATERIA_PRIMA: 'MP', PRODUCTO_TERMINADO: 'PT' }[valor] || valor;
  if (!['MP', 'PT', 'INSUMO', 'EMPAQUE'].includes(tipo)) {
    throw Object.assign(new Error('Tipo de producto inválido'), { status: 422 });
  }
  return tipo;
}

module.exports = { tipoProducto, TIPOS_PRODUCTO };
