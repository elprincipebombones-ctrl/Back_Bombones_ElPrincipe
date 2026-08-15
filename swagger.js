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
  apis: ['./routes/*.js', './routes/recepcion/*.js'],
});
console.log(Object.keys(swaggerSpec.paths));
module.exports = swaggerSpec;
