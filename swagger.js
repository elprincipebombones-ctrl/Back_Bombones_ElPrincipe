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
    },
    security: [{ bearerAuth: [] }],
  },
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

module.exports = swaggerSpec;
