const { Proveedor } = require('../../models');
const pedidos = require('../../services/ventas/pedidos.service');
const stock = require('../../services/ventas/stock-pedidos.service');
const { ok, created } = require('../../utils/response');

const ejecutar = (action) => async (req, res, next) => {
  try {
    const result = await action(req);
    return ok(res, result);
  } catch (error) {
    return next(error);
  }
};

exports.listar = ejecutar(() => pedidos.listar());
exports.obtener = ejecutar((req) => pedidos.obtener(req.params.id));
exports.actualizar = ejecutar((req) => pedidos.actualizar(req.params.id, req.body));
exports.confirmar = ejecutar((req) => pedidos.confirmar(req.params.id));
exports.cancelar = ejecutar((req) =>
  pedidos.cancelar(req.params.id, req.body.motivoCancelacion, req.usuario.id),
);

exports.crear = async (req, res, next) => {
  try {
    return created(res, await pedidos.crear(req.body, req.usuario.id));
  } catch (error) {
    return next(error);
  }
};

exports.clientes = ejecutar(() =>
  Proveedor.findAll({
    where: { esCliente: true, estado: true },
    attributes: [
      'id',
      'tipoDocumento',
      'numeroDocumento',
      'razonSocial',
      'nombreComercial',
      'telefono',
      'direccion',
      'email',
    ],
    order: [
      ['razonSocial', 'ASC'],
      ['numeroDocumento', 'ASC'],
    ],
  }),
);

exports.productos = ejecutar(() => stock.productosDisponibles());
