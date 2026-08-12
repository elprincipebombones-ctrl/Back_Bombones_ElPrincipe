const { Router } = require('express');
const auth = require('../../middleware/auth');
const registrarCrud = require('./registrarCrud');
const catalogos = require('../../validators/calidad/catalogos.validator');
const configuracion = require('../../validators/calidad/configuracion.validator');
const validar = require('../../middleware/validar');
const permiso = require('../../middleware/permiso');

const router = Router();
router.use(auth);

/**
 * @swagger
 * tags:
 *   - name: Calidad
 *     description: Maestros y configuración del motor de calidad
 * /api/calidad/tipos-inspeccion:
 *   get:
 *     tags: [Calidad]
 *     summary: Lista los tipos de inspección
 *     security: [{ bearerAuth: [] }]
 *   post:
 *     tags: [Calidad]
 *     summary: Crea un tipo de inspección
 *     security: [{ bearerAuth: [] }]
 * /api/calidad/versiones-formato/{id}/completa:
 *   get:
 *     tags: [Calidad]
 *     summary: Obtiene una versión con formato, secciones, campos, reglas y acciones
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 */

const montar = (ruta, controlador, crear, actualizar) =>
  router.use(
    ruta,
    registrarCrud({
      controlador,
      validadores: { id: catalogos.idValidator, crear, actualizar },
      prefijoPermiso: 'calidad',
    }),
  );

montar(
  '/tipos-inspeccion',
  require('../../controllers/calidad/tipo-inspeccion.controller'),
  catalogos.crearCatalogoValidator,
  catalogos.actualizarCatalogoValidator,
);
montar(
  '/unidades-medida',
  require('../../controllers/calidad/unidad-medida.controller'),
  catalogos.crearUnidadValidator,
  catalogos.actualizarUnidadValidator,
);
montar(
  '/parametros',
  require('../../controllers/calidad/parametro-calidad.controller'),
  catalogos.crearParametroValidator,
  catalogos.actualizarParametroValidator,
);
montar(
  '/tipos-campo',
  require('../../controllers/calidad/tipo-campo.controller'),
  catalogos.crearTipoCampoValidator,
  catalogos.actualizarTipoCampoValidator,
);
montar(
  '/niveles-severidad',
  require('../../controllers/calidad/nivel-severidad.controller'),
  catalogos.crearNivelValidator,
  catalogos.actualizarNivelValidator,
);
montar(
  '/tipos-accion',
  require('../../controllers/calidad/tipo-accion.controller'),
  catalogos.crearCatalogoValidator,
  catalogos.actualizarCatalogoValidator,
);
montar(
  '/lugares-inspeccion',
  require('../../controllers/calidad/lugar-inspeccion.controller'),
  catalogos.crearCatalogoValidator,
  catalogos.actualizarCatalogoValidator,
);

const formato = require('../../controllers/calidad/formato-calidad.controller');
router.get('/formatos', permiso('calidad.ver'), formato.listar);
router.get('/formatos/:id', permiso('calidad.ver'), configuracion.idValidator, validar, formato.obtener);
router.post('/formatos', permiso('calidad.crear'), configuracion.crearFormatoValidator, validar, formato.crear);
router.put('/formatos/:id', permiso('calidad.editar'), configuracion.actualizarFormatoValidator, validar, formato.actualizar);
router.delete('/formatos/:id', permiso('calidad.eliminar'), configuracion.idValidator, validar, formato.eliminar);

const version = require('../../controllers/calidad/version-formato.controller');
router.get(
  '/formatos/:formatoId/versiones',
  permiso('calidad.ver'),
  configuracion.formatoIdValidator,
  validar,
  version.listarPorFormato,
);
router.post(
  '/formatos/:formatoId/versiones',
  permiso('calidad.crear'),
  (req, _res, next) => {
    req.body.formatoCalidadId = req.params.formatoId;
    next();
  },
  configuracion.formatoIdValidator,
  configuracion.crearVersionValidator,
  validar,
  version.crear,
);
router.get('/versiones-formato/:id/completa', permiso('calidad.ver'), configuracion.idValidator, validar, version.obtenerCompleta);
router.use(
  '/versiones-formato',
  registrarCrud({
    controlador: version,
    validadores: {
      id: configuracion.idValidator,
      crear: configuracion.crearVersionValidator,
      actualizar: configuracion.actualizarVersionValidator,
    },
    prefijoPermiso: 'calidad',
  }),
);

const configuraciones = [
  {
    ruta: '/secciones-formato',
    controlador: require('../../controllers/calidad/seccion-formato.controller'),
    crear: configuracion.crearSeccionValidator,
    actualizar: configuracion.actualizarSeccionValidator,
  },
  {
    ruta: '/campos-formato',
    controlador: require('../../controllers/calidad/campo-formato.controller'),
    crear: configuracion.crearCampoValidator,
    actualizar: configuracion.actualizarCampoValidator,
  },
  {
    ruta: '/opciones-campo',
    controlador: require('../../controllers/calidad/opcion-campo.controller'),
    crear: configuracion.crearOpcionValidator,
    actualizar: configuracion.actualizarOpcionValidator,
  },
];

for (const item of configuraciones) {
  router.use(
    item.ruta,
    registrarCrud({
      controlador: item.controlador,
      validadores: { id: configuracion.idValidator, crear: item.crear, actualizar: item.actualizar },
      prefijoPermiso: 'calidad',
    }),
  );
}

module.exports = router;
