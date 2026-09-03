const { Router } = require('express');
const permiso = require('../../middleware/permiso');
const validar = require('../../middleware/validar');

module.exports = ({ controlador, validadores, prefijoPermiso }) => {
  const router = Router();
  router.get('/', permiso(`${prefijoPermiso}.ver`), controlador.listar);
  router.get(
    '/:id',
    permiso(`${prefijoPermiso}.ver`),
    validadores.id,
    validar,
    controlador.obtener,
  );
  router.post(
    '/',
    permiso(`${prefijoPermiso}.crear`),
    validadores.crear,
    validar,
    controlador.crear,
  );
  router.put(
    '/:id',
    permiso(`${prefijoPermiso}.editar`),
    validadores.actualizar,
    validar,
    controlador.actualizar,
  );
  router.delete(
    '/:id',
    permiso(`${prefijoPermiso}.eliminar`),
    validadores.id,
    validar,
    controlador.eliminar,
  );
  return router;
};
