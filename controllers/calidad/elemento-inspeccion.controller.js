const { ElementoInspeccion, CategoriaElemento } = require('../../models');
const crearCrud = require('./crearCrud');
const { ok } = require('../../utils/response');

const crud = crearCrud({
  modelo: ElementoInspeccion,
  nombre: 'Elemento de inspección',
  campoUnico: 'codigo',
  include: [{ model: CategoriaElemento, as: 'categoria' }],
  order: [
    ['orden', 'ASC'],
    ['nombre', 'ASC'],
  ],
  relaciones: [
    {
      campo: 'categoriaElementoId',
      modelo: CategoriaElemento,
      mensaje: 'Categoría no encontrada',
    },
  ],
});

exports.listar = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.categoria_id) where.categoriaElementoId = req.query.categoria_id;
    if (req.query.estado !== undefined) where.estado = req.query.estado === 'true';
    return ok(
      res,
      await ElementoInspeccion.findAll({
        where,
        include: [{ model: CategoriaElemento, as: 'categoria' }],
        order: [
          ['orden', 'ASC'],
          ['nombre', 'ASC'],
        ],
      }),
    );
  } catch (error) {
    return next(error);
  }
};
exports.obtener = crud.obtener;
exports.crear = crud.crear;
exports.actualizar = crud.actualizar;
exports.eliminar = crud.eliminar;
