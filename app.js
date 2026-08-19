require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');

const sequelize = require('./database/database');
require('./models'); 

const routes = require('./routes');
const errorMiddleware = require('./middleware/error');
const { generalLimiter } = require('./middleware/rateLimit');
const swaggerSpec = require('./swagger');
const sockets = require('./sockets');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(generalLimiter);

// Healthcheck
app.get('/', (req, res) =>
  res.json({ success: true, message: 'Backend API operativo', docs: '/api/docs' }),
);

// Swagger
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rutas
app.use('/api', routes);

// 404
app.use((req, res) =>
  res.status(404).json({ success: false, message: 'Recurso no encontrado' }),
);

// Manejo de errores centralizado
app.use(errorMiddleware);

const PORT = process.env.PORT || 3000;

const httpServer = http.createServer(app);
sockets.init(httpServer);

const { db } = require('./database/database');



(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    console.log('[db] Conexión establecida');
    httpServer.listen(PORT, () => {
      console.log(`[server] Escuchando en http://localhost:${PORT}`);
      console.log(`[docs]   http://localhost:${PORT}/api/docs`);
    });
  } catch (err) {
    console.error('[db] Error conectando a la base de datos:', err.message);
    process.exit(1);
  }
})();

module.exports = app;
