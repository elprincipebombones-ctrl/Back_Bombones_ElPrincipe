const { Router } = require('express');

const router = Router();

router.use('/auth', require('./auth.routes'));
router.use('/usuarios', require('./usuario.routes'));
router.use('/roles', require('./rol.routes'));
router.use('/permisos', require('./permiso.routes'));
router.use('/menus', require('./menu.routes'));
router.use('/calidad', require('./calidad'));
router.use('/reglas', require('./reglas'));

module.exports = router;
