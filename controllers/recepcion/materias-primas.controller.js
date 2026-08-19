const MateriaPrima = require('../../models/Recepcion/MateriaPrima');
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
    const {
      nombre,
      codigo,
      descripcion,
      unidadMedida,
      estado
    } = req.body;

    if (!nombre) {
      return fail(res, 'Falta el nombre', 400);
    }

    if (!codigo) {
      return fail(res, 'Falta el código', 400);
    }

    const materiaPrimaExistente = await MateriaPrima.findOne({
      where: {
        codigo
      }
    });

    if (materiaPrimaExistente) {
      return fail(
        res,
        'Ya existe una materia prima con ese código',
        409
      );
    }

    const materiaPrima = await MateriaPrima.create({
      nombre,
      codigo,
      descripcion,
      unidadMedida,
      estado: estado !== undefined ? estado : true
    });

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

    if (
      req.body.codigo &&
      req.body.codigo !== materiaPrima.codigo
    ) {
      const materiaPrimaExistente = await MateriaPrima.findOne({
        where: {
          codigo: req.body.codigo
        }
      });

      if (
        materiaPrimaExistente &&
        materiaPrimaExistente.id !== materiaPrima.id
      ) {
        return fail(
          res,
          'Ya existe una materia prima con ese código',
          409
        );
      }
    }

    await materiaPrima.update(req.body);

    return ok(
      res,
      materiaPrima,
      'Materia prima actualizada'
    );
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

    return ok(
      res,
      null,
      'Materia prima eliminada'
    );
  } catch (err) {
    return next(err);
  }
};