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
router.use('/categoria-producto', require('./recepcion/categoriaProducto.routes'))
router.use('/recepciones', require('./recepcion/recepcion.routes'))
router.use('/bodegas', require('./Inventario/bodegas.routes'))
router.use('/calidad', require('./calidad'));
router.use('/reglas', require('./reglas'));
router.use('/unidad-medida', require('./recepcion/unidadMedida.routes'));

module.exports = router;
