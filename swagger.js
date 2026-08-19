const swaggerJSDoc = require('swagger-jsdoc');

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Backend API',
      version: '1.0.0',
      description: 'API REST con autenticación JWT, roles, permisos y menús dinámicos.',
    },
    servers: [{ url: 'http://localhost:3000', description: 'Local' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        ParametroCalidad: {
          type: 'object', required: ['codigo', 'nombre', 'tipoCampoId'],
          properties: {
            codigo: { type: 'string', example: 'CLORO_AGUA_POTABLE' },
            nombre: { type: 'string', example: 'Cloro agua potable' },
            tipoCampoId: { type: 'string', format: 'uuid' },
            unidadMedidaId: { type: 'string', format: 'uuid', nullable: true },
            valorMinimo: { type: 'number', nullable: true, example: 0.3 },
            valorMaximo: { type: 'number', nullable: true, example: 2 },
            precisionDecimal: { type: 'integer', nullable: true, example: 2 },
            esObligatorioDefault: { type: 'boolean', example: true },
            bloquearAlGuardarDefault: { type: 'boolean', example: true },
          },
        },
        ReglaParametro: {
          type: 'object', required: ['parametroCalidadId', 'codigo', 'nombre', 'resultado'],
          properties: {
            parametroCalidadId: { type: 'string', format: 'uuid' },
            campoFormatoId: { type: 'string', format: 'uuid', nullable: true, deprecated: true },
            codigo: { type: 'string', example: 'CLORO_BAJO' },
            nombre: { type: 'string', example: 'Cloro por debajo del rango' },
            resultado: { type: 'string', enum: ['CUMPLE', 'NO_CUMPLE'] },
            nivelSeveridadId: { type: 'string', format: 'uuid', nullable: true },
            mensajeIncumplimiento: { type: 'string', nullable: true },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./routes/*.js', './routes/recepcion/*.js'],
  apis: ['./routes/*.js', './routes/**/*.js'],
});

const operacion = (summary, requiereBody = false) => ({
  summary,
  tags: [summary.includes('regla') || summary.includes('condición') || summary.includes('acción')
    ? 'Reglas de calidad'
    : 'Calidad'],
  security: [{ bearerAuth: [] }],
  ...(requiereBody
    ? {
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object' } } },
        },
      }
    : {}),
  responses: { 200: { description: 'Operación exitosa' }, 422: { description: 'Datos inválidos' } },
});

const documentarCrud = (ruta, recurso) => {
  swaggerSpec.paths[ruta] = {
    ...(swaggerSpec.paths[ruta] || {}),
    get: operacion(`Listar ${recurso}`),
    post: operacion(`Crear ${recurso}`, true),
  };
  swaggerSpec.paths[`${ruta}/{id}`] = {
    get: operacion(`Obtener ${recurso}`),
    put: operacion(`Actualizar ${recurso}`, true),
    delete: operacion(`Desactivar o eliminar ${recurso}`),
    parameters: [
      { in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } },
    ],
  };
};

[
  ['/api/calidad/tipos-inspeccion', 'tipos de inspección'],
  ['/api/calidad/unidades-medida', 'unidades de medida'],
  ['/api/calidad/parametros', 'parámetros de calidad'],
  ['/api/calidad/tipos-campo', 'tipos de campo'],
  ['/api/calidad/niveles-severidad', 'niveles de severidad'],
  ['/api/calidad/tipos-accion', 'tipos de acción'],
  ['/api/calidad/lugares-inspeccion', 'lugares de inspección'],
  ['/api/calidad/formatos', 'formatos de calidad'],
  ['/api/calidad/versiones-formato', 'versiones de formato'],
  ['/api/calidad/secciones-formato', 'secciones de formato'],
  ['/api/calidad/campos-formato', 'campos de formato'],
  ['/api/calidad/opciones-campo', 'opciones de campo'],
  ['/api/reglas/reglas-calidad', 'reglas de calidad'],
  ['/api/reglas/condiciones-regla', 'condiciones de regla'],
  ['/api/reglas/acciones-regla', 'acciones de regla'],
].forEach(([ruta, recurso]) => documentarCrud(ruta, recurso));

swaggerSpec.paths['/api/calidad/parametros'].post.requestBody.content['application/json'].schema = {
  $ref: '#/components/schemas/ParametroCalidad',
};
swaggerSpec.paths['/api/reglas/reglas-calidad'].post.requestBody.content['application/json'].schema = {
  $ref: '#/components/schemas/ReglaParametro',
};

const operacionConEjemplo = (summary, ejemplo) => ({
  ...operacion(summary, true),
  requestBody: {
    required: true,
    content: { 'application/json': { schema: { type: 'object' }, example: ejemplo } },
  },
});

swaggerSpec.paths['/api/calidad/inspecciones'] = {
  get: operacion('Listar inspecciones'),
  post: operacionConEjemplo('Crear inspección', {
    version_formato_id: 'uuid-version-publicada',
    lugar_inspeccion_id: null,
    fecha_inspeccion: '2026-08-15',
    observaciones: null,
  }),
};
swaggerSpec.paths['/api/calidad/inspecciones/pendientes'] = {
  get: operacion('Listar inspecciones vencidas pendientes'),
};
swaggerSpec.paths['/api/calidad/inspecciones/{id}'] = {
  get: operacion('Obtener inspección'),
  put: operacionConEjemplo('Actualizar inspección', { observaciones: 'Inspección en proceso' }),
};
swaggerSpec.paths['/api/calidad/inspecciones/{id}/completa'] = {
  get: operacion('Obtener inspección completa'),
};
swaggerSpec.paths['/api/calidad/inspecciones/{id}/respuestas'] = {
  post: operacionConEjemplo('Guardar respuestas y evaluar reglas', {
    respuestas: [
      { campo_formato_id: 'uuid-campo', valor_numero: 6.8, observacion: null, opciones: [] },
    ],
  }),
};
swaggerSpec.paths['/api/calidad/inspecciones/{id}/completar'] = {
  post: operacion('Completar inspección'),
};
swaggerSpec.paths['/api/calidad/inspecciones/{id}/cerrar'] = {
  post: operacion('Cerrar inspección'),
};
swaggerSpec.paths['/api/calidad/acciones-correctivas'] = {
  get: operacion('Listar acciones correctivas'),
};
swaggerSpec.paths['/api/calidad/acciones-correctivas/{id}'] = {
  get: operacion('Obtener acción correctiva'),
  put: operacionConEjemplo('Actualizar acción correctiva', {
    responsable_id: 'uuid-usuario',
    fecha_limite: '2026-08-20T18:00:00Z',
  }),
};
swaggerSpec.paths['/api/calidad/acciones-correctivas/{id}/iniciar'] = {
  post: operacion('Iniciar acción correctiva'),
};
swaggerSpec.paths['/api/calidad/acciones-correctivas/{id}/cerrar'] = {
  post: operacionConEjemplo('Cerrar acción correctiva', {
    observacion_cierre: 'Acción verificada',
  }),
};
swaggerSpec.paths['/api/calidad/acciones-correctivas/{id}/seguimientos'] = {
  post: operacionConEjemplo('Registrar seguimiento de acción correctiva', {
    tipo_registro: 'NUEVA_MEDICION',
    valor_numero: 3.2,
    unidad_medida_id: 'uuid-unidad',
    resultado_cumple: true,
    descripcion: 'Medición posterior al ajuste',
  }),
};
swaggerSpec.paths['/api/calidad/acciones-correctivas/{id}/evidencias'] = {
  post: operacionConEjemplo('Registrar evidencia de acción correctiva', {
    nombre_archivo: 'evidencia.jpg',
    tipo_archivo: 'image/jpeg',
    url_archivo: 'https://example.com/evidencias/evidencia.jpg',
    descripcion: 'Evidencia posterior al ajuste',
  }),
};
swaggerSpec.paths['/api/calidad/desviaciones'] = { get: operacion('Listar desviaciones') };
swaggerSpec.paths['/api/calidad/desviaciones/{id}'] = {
  get: operacion('Obtener desviación'),
  put: operacionConEjemplo('Actualizar desviación', { estado: 'EN_TRATAMIENTO' }),
};
swaggerSpec.paths['/api/calidad/desviaciones/{id}/cerrar'] = {
  post: operacion('Cerrar desviación'),
};

Object.entries(swaggerSpec.paths).forEach(([ruta, definicion]) => {
  if (ruta.includes('{id}') && !definicion.parameters) {
    definicion.parameters = [
      { in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } },
    ];
  }
});

module.exports = swaggerSpec;
