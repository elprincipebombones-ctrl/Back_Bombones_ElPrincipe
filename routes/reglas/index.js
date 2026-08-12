const { Router } = require('express');
const auth = require('../../middleware/auth');
const registrarCrud = require('../calidad/registrarCrud');
const validadores = require('../../validators/reglas/reglas.validator');

const router = Router();
router.use(auth);

/**
 * @swagger
 * tags:
 *   - name: Reglas de calidad
 *     description: Configuración de reglas, condiciones y acciones
 * /api/reglas/reglas-calidad:
 *   get:
 *     tags: [Reglas de calidad]
 *     summary: Lista las reglas configuradas
 *     security: [{ bearerAuth: [] }]
 *   post:
 *     tags: [Reglas de calidad]
 *     summary: Crea una regla de calidad
 *     security: [{ bearerAuth: [] }]
 */

const recursos = [
  {
    ruta: '/reglas-calidad',
    controlador: require('../../controllers/reglas/regla-calidad.controller'),
    crear: validadores.crearReglaValidator,
    actualizar: validadores.actualizarReglaValidator,
  },
  {
    ruta: '/condiciones-regla',
    controlador: require('../../controllers/reglas/condicion-regla.controller'),
    crear: validadores.crearCondicionValidator,
    actualizar: validadores.actualizarCondicionValidator,
  },
  {
    ruta: '/acciones-regla',
    controlador: require('../../controllers/reglas/accion-regla.controller'),
    crear: validadores.crearAccionValidator,
    actualizar: validadores.actualizarAccionValidator,
  },
];

for (const recurso of recursos) {
  router.use(
    recurso.ruta,
    registrarCrud({
      controlador: recurso.controlador,
      validadores: { id: validadores.idValidator, crear: recurso.crear, actualizar: recurso.actualizar },
      prefijoPermiso: 'reglas',
    }),
  );
}

module.exports = router;
