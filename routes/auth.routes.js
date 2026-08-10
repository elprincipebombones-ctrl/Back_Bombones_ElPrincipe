const { Router } = require('express');
const ctrl = require('../controllers/auth.controller');
const auth = require('../middleware/auth');
const validar = require('../middleware/validar');
const { authLimiter } = require('../middleware/rateLimit');
const { loginValidator, refreshValidator } = require('../validators/auth.validator');

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Autenticación
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Inicia sesión
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               correo: { type: string, example: admin@empresa.com }
 *               password: { type: string, example: Admin123* }
 *     responses:
 *       200: { description: OK }
 */
router.post('/login', authLimiter, loginValidator, validar, ctrl.login);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresca el token
 */
router.post('/refresh', refreshValidator, validar, ctrl.refresh);

/**
 * @swagger
 * /api/auth/perfil:
 *   get:
 *     tags: [Auth]
 *     summary: Devuelve el perfil, permisos y menús del usuario autenticado
 *     security: [{ bearerAuth: [] }]
 */
router.get('/perfil', auth, ctrl.perfil);

module.exports = router;
