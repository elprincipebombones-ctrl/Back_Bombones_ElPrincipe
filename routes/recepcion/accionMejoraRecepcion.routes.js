const { Router } = require('express');
const { body, param } = require('express-validator');

const ctrl = require('../../controllers/recepcion/accionMejoraRecepcion.controller');
const auth = require('../../middleware/auth');
const permiso = require('../../middleware/permiso');
const validar = require('../../middleware/validar');
const { recepcionIdValidator } = require('../../validators/recepcion.validator');

const router = Router();

router.use(auth);

router.get(
  '/:recepcionId/acciones-mejora',
  permiso('Recepcion.Ver'),
  recepcionIdValidator,
  validar,
  ctrl.listar,
);

router.put(
  '/:recepcionId/acciones-mejora/:id',
  permiso('Recepcion.Editar'),
  recepcionIdValidator,
  param('id').isUUID().withMessage('ID de acción de mejora inválido'),
  body('decision')
    .isIn(['RECIBIR', 'NO_RECIBIR'])
    .withMessage('La decisión debe ser RECIBIR o NO_RECIBIR'),
  body('observacion').trim().notEmpty().withMessage('La observación es obligatoria'),
  validar,
  ctrl.actualizar,
);

module.exports = router;
