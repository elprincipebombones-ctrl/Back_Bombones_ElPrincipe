const camposNaturales = new Set([
  'nombre',
  'descripcion',
  'observaciones',
  'observacion',
  'razonSocial',
  'direccion',
  'etiqueta',
  'textoAyuda',
  'comentario',
  'tratamiento',
  'causaRaiz',
  'pregunta',
  'mensajeIncumplimiento',
  'motivoCancelacion',
]);

const capitalizarTexto = (valor) => {
  return valor
    .trim()
    .toLocaleLowerCase('es')
    .replace(/\p{L}/u, (letra) => letra.toLocaleUpperCase('es'));
};

const normalizarTextos = (datos, excluir = new Set()) => {
  if (!datos || typeof datos !== 'object') return datos;
  for (const [campo, valor] of Object.entries(datos)) {
    if (camposNaturales.has(campo) && !excluir.has(campo) && typeof valor === 'string')
      datos[campo] = capitalizarTexto(valor);
    else if (valor && typeof valor === 'object') normalizarTextos(valor, excluir);
  }
  return datos;
};

const formatoTextos = (req, _res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    // Permission names are identifiers used by authorization, not natural language.
    const esPermiso = /^\/api\/permisos(?:\/|\?|$)/i.test(req.originalUrl || req.url || '');
    normalizarTextos(req.body, esPermiso ? new Set(['nombre']) : undefined);
  }
  next();
};

module.exports = { formatoTextos, normalizarTextos, capitalizarTexto };
