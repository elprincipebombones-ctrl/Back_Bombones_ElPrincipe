const  MateriaPrima = require('../../models/Recepcion/MateriaPrima');
const { ok, created, fail } = require('../../utils/response');

exports.listar = async (req, res, next) => {
  try {
    const materiasPrimas = await MateriaPrima.findAll({
      order: [['nombre', 'ASC']]
    });

    return ok(res, materiasPrimas);
  } catch (err) {
    return next(err);
  }
};

exports.obtener = async (req, res, next) => {
  try {
    const materiaPrima = await MateriaPrima.findByPk(req.params.id);

    if (!materiaPrima) {
      return fail(res, 'Materia prima no encontrada', 404);
    }

    return ok(res, materiaPrima);
  } catch (err) {
    return next(err);
  }
};

exports.crear = async (req, res, next) => {
  try {


    const { nombre, codigo, descripcion, unidadMedida } = req.body
    
    console.log('Me llego ', nombre)
    if(!nombre) fail(res, 'Falta el nombre', 400)
    const materiaPrima = await MateriaPrima.create({ nombre , codigo, descripcion, unidadMedida});

    return created(res, materiaPrima);
  } catch (err) {
    return next(err);
  }
};

exports.actualizar = async (req, res, next) => {
  try {
    const materiaPrima = await MateriaPrima.findByPk(req.params.id);

    if (!materiaPrima) {
      return fail(res, 'Materia prima no encontrada', 404);
    }

    await materiaPrima.update(req.body);

    return ok(res, materiaPrima, 'Materia prima actualizada');
  } catch (err) {
    return next(err);
  }
};

exports.eliminar = async (req, res, next) => {
  try {
    const materiaPrima = await MateriaPrima.findByPk(req.params.id);

    if (!materiaPrima) {
      return fail(res, 'Materia prima no encontrada', 404);
    }

    await materiaPrima.destroy();

    return ok(res, null, 'Materia prima eliminada');
  } catch (err) {
    return next(err);
  }
};