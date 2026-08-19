const { CategoriaElemento, ElementoInspeccion } = require('../../models');
const crearCrud = require('./crearCrud');
const { ok, fail } = require('../../utils/response');

const crud = crearCrud({
  modelo: CategoriaElemento,
  nombre: 'Categoría de elementos',
  campoUnico: 'codigo',
  include: [{ model: ElementoInspeccion, as: 'elementos', required: false }],
  order: [['orden', 'ASC'], ['nombre', 'ASC']],
});

exports.listar = crud.listar;
exports.obtener = crud.obtener;
exports.crear = crud.crear;
exports.actualizar = crud.actualizar;
exports.eliminar = crud.eliminar;
exports.listarElementos = async (req, res, next) => {
  try {
    const categoria = await CategoriaElemento.findByPk(req.params.id);
    if (!categoria) return fail(res, 'Categoría de elementos no encontrada', 404);
    return ok(res, await ElementoInspeccion.findAll({
      where: { categoriaElementoId: categoria.id },
      order: [['orden', 'ASC'], ['nombre', 'ASC']],
    }));
  } catch (error) {
    return next(error);
  }
};
