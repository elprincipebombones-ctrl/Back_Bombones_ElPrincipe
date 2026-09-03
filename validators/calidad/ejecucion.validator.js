const { body, param, query } = require('express-validator');

const valor = (objeto, camel, snake) => objeto[camel] ?? objeto[snake];
const uuidEnBody = (camel, snake, opcional = false) =>
  body().custom((_, { req }) => {
    const dato = valor(req.body, camel, snake);
    if (opcional && (dato === null || dato === undefined)) return true;
    if (
      typeof dato !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(dato)
    ) {
      throw new Error(`${snake} debe ser UUID válido`);
    }
    return true;
  });

exports.idValidator = [param('id').isUUID()];
exports.listarInspeccionesValidator = [
  query('estado')
    .optional()
    .isIn(['BORRADOR', 'EN_PROCESO', 'PENDIENTE_ACCION', 'CERRADA', 'CERRADA_INCOMPLETA']),
  query('fecha_desde').optional().isISO8601(),
  query('fecha_hasta').optional().isISO8601(),
];
exports.crearInspeccionValidator = [
  uuidEnBody('formatoCalidadId', 'formato_calidad_id'),
  uuidEnBody('lugarInspeccionId', 'lugar_inspeccion_id'),
  body('observaciones').optional({ nullable: true }).isString(),
];
exports.actualizarInspeccionValidator = [
  param('id').isUUID(),
  uuidEnBody('lugarInspeccionId', 'lugar_inspeccion_id', true),
  body('observaciones').optional({ nullable: true }).isString(),
];
exports.guardarRespuestasValidator = [
  param('id').isUUID(),
  body('respuestas')
    .isArray({ min: 1 })
    .withMessage('respuestas debe contener al menos un elemento'),
  body('respuestas.*').custom((respuesta) => {
    const campoId = valor(respuesta, 'campoFormatoId', 'campo_formato_id');
    if (typeof campoId !== 'string' || !/^[0-9a-f-]{36}$/i.test(campoId)) {
      throw new Error('campo_formato_id debe ser UUID válido');
    }
    if (respuesta.opciones !== undefined && !Array.isArray(respuesta.opciones)) {
      throw new Error('opciones debe ser un arreglo');
    }
    if (respuesta.opciones?.some((id) => typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id))) {
      throw new Error('Cada opción debe ser UUID válido');
    }
    return true;
  }),
];
exports.guardarChecklistValidator = [
  param('id').isUUID(),
  body('respuestas').isArray({ min: 1 }),
  body('respuestas.*.elementoChecklistId').isUUID(),
  body('respuestas.*.resultado').isIn(['CUMPLE', 'NO_CUMPLE']),
  body('respuestas.*.observacion').optional({ nullable: true }).isString(),
];
exports.actualizarAccionValidator = [
  param('id').isUUID(),
  uuidEnBody('responsableId', 'responsable_id', true),
  body('descripcion').optional({ nullable: true }).isString(),
  body().custom((_, { req }) => {
    const fecha = valor(req.body, 'fechaLimite', 'fecha_limite');
    if (fecha !== undefined && fecha !== null && Number.isNaN(Date.parse(fecha))) {
      throw new Error('fecha_limite inválida');
    }
    return true;
  }),
];
exports.cerrarAccionValidator = [
  param('id').isUUID(),
  body('observacion_cierre').optional({ nullable: true }).isString(),
  body('observacionCierre').optional({ nullable: true }).isString(),
];
exports.crearAprobadorValidator = [uuidEnBody('usuarioId', 'usuario_id')];
exports.crearSeguimientoValidator = [
  param('id').isUUID(),
  body().custom((_, { req }) => {
    const tipo = valor(req.body, 'tipoRegistro', 'tipo_registro');
    if (!['NUEVA_MEDICION', 'OBSERVACION', 'AJUSTE', 'VERIFICACION'].includes(tipo)) {
      throw new Error('tipo_registro no permitido');
    }
    return true;
  }),
  uuidEnBody('unidadMedidaId', 'unidad_medida_id', true),
  body().custom((_, { req }) => {
    const numero = valor(req.body, 'valorNumero', 'valor_numero');
    if (numero !== undefined && numero !== null && !Number.isFinite(Number(numero))) {
      throw new Error('valor_numero debe ser numérico');
    }
    const cumple = valor(req.body, 'resultadoCumple', 'resultado_cumple');
    if (cumple !== undefined && cumple !== null && typeof cumple !== 'boolean') {
      throw new Error('resultado_cumple debe ser booleano');
    }
    return true;
  }),
  body('descripcion').optional({ nullable: true }).isString(),
];
exports.crearEvidenciaValidator = [
  param('id').isUUID(),
  body().custom((_, { req }) => {
    const nombre = valor(req.body, 'nombreArchivo', 'nombre_archivo');
    const url = valor(req.body, 'urlArchivo', 'url_archivo');
    if (!nombre || String(nombre).length > 255) throw new Error('nombre_archivo es requerido');
    try {
      new URL(url);
    } catch {
      throw new Error('url_archivo debe ser una URL válida');
    }
    return true;
  }),
  uuidEnBody('seguimientoAccionCorrectivaId', 'seguimiento_accion_correctiva_id', true),
  body('descripcion').optional({ nullable: true }).isString(),
];
exports.listarAccionesValidator = [
  query('estado').optional().isIn(['PENDIENTE', 'EN_PROCESO', 'PENDIENTE_APROBACION', 'CERRADA']),
  query('solo_pendientes').optional().isBoolean(),
  query('responsable_id').optional().isUUID(),
];
exports.listarDesviacionesValidator = [
  query('estado').optional().isIn(['ABIERTA', 'EN_TRATAMIENTO', 'CERRADA']),
  query('inspeccion_id').optional().isUUID(),
];
exports.actualizarDesviacionValidator = [
  param('id').isUUID(),
  body('descripcion').optional({ nullable: true }).isString(),
  body('estado').optional().equals('EN_TRATAMIENTO'),
];
