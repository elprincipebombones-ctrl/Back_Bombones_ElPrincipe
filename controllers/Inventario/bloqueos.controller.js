const { ok, created } = require('../../utils/response');
const service = require('../../services/inventario/bloqueos.service');
const contexto = (req) => ({ ip: req.ip, metadatos: { userAgent: req.get('user-agent') || null } });
exports.congelar = async (req, res) =>
  created(
    res,
    await service.congelar(req.body, req.usuario.id, contexto(req)),
    'La existencia fue congelada correctamente.',
  );
exports.liberar = async (req, res) =>
  ok(
    res,
    await service.liberar(req.params.id, req.body.nota, req.usuario.id, contexto(req)),
    'La existencia fue liberada correctamente.',
  );
exports.listar = async (req, res) => ok(res, await service.listar(req.query, false));
exports.historial = async (req, res) => ok(res, await service.listar(req.query, true));
exports.obtener = async (req, res) => ok(res, await service.obtener(req.params.id));
exports.estado = async (req, res) => ok(res, await service.estadoExistencia(req.query));
