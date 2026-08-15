const  LugarArea   = require('../../models/Recepcion/LugarArea');
const { ok, created, fail } = require('../../utils/response');

exports.listar = async (req, res, next) => {
  try {
    const materiasPrimas = await LugarArea .findAll({
      order: [['nombre', 'ASC']]
    });

    return ok(res, materiasPrimas);
  } catch (err) {
    return next(err);
  }
};

exports.obtener = async (req, res, next) => {
  try {
    const LugarArea  = await LugarArea .findByPk(req.params.id);

    if (!LugarArea ) {
      return fail(res, 'Materia prima no encontrada', 404);
    }

    return ok(res, LugarArea );
  } catch (err) {
    return next(err);
  }
};

exports.crear = async (req, res, next) => {
  try {


    const { nombre, codigo, descripcion, unidadMedida } = req.body
    
    console.log('Me llego ', nombre)
    if(!nombre) fail(res, 'Falta el nombre', 400)
    const LugarArea  = await LugarArea .create({ nombre , codigo, descripcion, unidadMedida});

    return created(res, LugarArea );
  } catch (err) {
    return next(err);
  }
};

exports.actualizar = async (req, res, next) => {
  try {
    const LugarArea  = await LugarArea .findByPk(req.params.id);

    if (!LugarArea ) {
      return fail(res, 'Materia prima no encontrada', 404);
    }

    await LugarArea .update(req.body);

    return ok(res, LugarArea , 'Materia prima actualizada');
  } catch (err) {
    return next(err);
  }
};

exports.eliminar = async (req, res, next) => {
  try {
    const LugarArea  = await LugarArea .findByPk(req.params.id);

    if (!LugarArea ) {
      return fail(res, 'Materia prima no encontrada', 404);
    }

    await LugarArea .destroy();

    return ok(res, null, 'Materia prima eliminada');
  } catch (err) {
    return next(err);
  }
};