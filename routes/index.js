const { Router } = require('express');

const router = Router();

router.use('/auth', require('./auth.routes'));
router.use('/usuarios', require('./usuario.routes'));
router.use('/roles', require('./rol.routes'));
router.use('/permisos', require('./permiso.routes'));
router.use('/menus', require('./menu.routes'));
router.use('/materias-primas', require('./recepcion/materia-prima.routes'))
router.use('/productos', require('./recepcion/producto.routes'))
router.use('/proveedores', require('./recepcion/proveedor.routes'))
router.use('/lugar-area', require('./recepcion/lugar-area.routes'))
router.use('/vehiculos', require('./recepcion/vehiculos.routes'))


module.exports = router;
