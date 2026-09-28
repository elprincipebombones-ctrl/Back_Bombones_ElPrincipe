const { Router } = require('express');
const { body, param } = require('express-validator');
const auth = require('../../middleware/auth');
const permiso = require('../../middleware/permiso');
const validar = require('../../middleware/validar');
const ctrl = require('../../controllers/ventas/pedidos.controller');

const router = Router();
const id = param('id').isUUID().withMessage('ID de pedido inválido');
const campos = [
  body('clienteId').isUUID().withMessage('Seleccione un cliente válido'),
  body('observaciones').optional({ nullable: true }).isString().isLength({ max: 2000 }),
  body('detalles').optional().isArray({ max: 500 }).withMessage('Detalles inválidos'),
  body('detalles.*.productoId').isUUID().withMessage('Producto inválido'),
  body('detalles.*.cantidad')
    .isDecimal({ decimal_digits: '0,3', force_decimal: false })
    .withMessage('Cantidad inválida'),
];

router.use(auth);
router.get('/clientes', permiso('ventas.pedidos.ver'), ctrl.clientes);
router.get('/productos-disponibles', permiso('ventas.pedidos.ver'), ctrl.productos);
router.get('/', permiso('ventas.pedidos.ver'), ctrl.listar);
router.get('/:id', permiso('ventas.pedidos.ver'), id, validar, ctrl.obtener);
router.post('/', permiso('ventas.pedidos.crear'), campos, validar, ctrl.crear);
router.put(
  '/:id',
  permiso('ventas.pedidos.editar'),
  id,
  body('clienteId').optional().isUUID(),
  body('observaciones').optional({ nullable: true }).isString().isLength({ max: 2000 }),
  body('detalles').optional().isArray({ max: 500 }),
  body('detalles.*.productoId').isUUID(),
  body('detalles.*.cantidad').isDecimal({ decimal_digits: '0,3', force_decimal: false }),
  validar,
  ctrl.actualizar,
);
router.post('/:id/confirmar', permiso('ventas.pedidos.confirmar'), id, validar, ctrl.confirmar);
router.post(
  '/:id/cancelar',
  permiso('ventas.pedidos.cancelar'),
  id,
  body('motivoCancelacion').isString().trim().notEmpty().isLength({ max: 2000 }),
  validar,
  ctrl.cancelar,
);

module.exports = router;
