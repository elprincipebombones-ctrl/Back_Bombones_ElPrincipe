const UnidadMedida = require('../../models/Recepcion/UnidadMedida');

const { ok, created, fail } = require('../../utils/response');

exports.listar = async (req, res, next) => {
  try {
    const unidades = await UnidadMedida.findAll({
      order: [['nombre', 'ASC']]
    });

    return ok(res, unidades);
  } catch (err) {
    return next(err);
  }
};

exports.obtener = async (req, res, next) => {
  try {
    const unidad = await UnidadMedida.findByPk(req.params.id);

    if (!unidad) {
      return fail(res, 'Unidad de medida no encontrada', 404);
    }

    return ok(res, unidad);
  } catch (err) {
    return next(err);
  }
};

exports.crear = async (req, res, next) => {
  try {
    const {
      codigo,
      nombre,
      simbolo,
      descripcion,
      estado
    } = req.body;

    if (!codigo) {
      return fail(res, 'Falta el código de la unidad de medida', 400);
    }

    if (!nombre) {
      return fail(res, 'Falta el nombre de la unidad de medida', 400);
    }

    if (!simbolo) {
      return fail(res, 'Falta el símbolo de la unidad de medida', 400);
    }

    const unidadExistente = await UnidadMedida.findOne({
      where: {
        codigo
      }
    });

    if (unidadExistente) {
      return fail(
        res,
        'Ya existe una unidad de medida con ese código',
        409
      );
    }

    const unidad = await UnidadMedida.create({
      codigo,
      nombre,
      simbolo,
      descripcion,
      estado: estado !== undefined ? estado : true
    });

    return created(res, unidad);
  } catch (err) {
    return next(err);
  }
};

exports.actualizar = async (req, res, next) => {
  try {
    const unidad = await UnidadMedida.findByPk(req.params.id);

    if (!unidad) {
      return fail(res, 'Unidad de medida no encontrada', 404);
    }

    if (
      req.body.codigo &&
      req.body.codigo !== unidad.codigo
    ) {
      const unidadExistente = await UnidadMedida.findOne({
        where: {
          codigo: req.body.codigo
        }
      });

      if (
        unidadExistente &&
        unidadExistente.id !== unidad.id
      ) {
        return fail(
          res,
          'Ya existe una unidad de medida con ese código',
          409
        );
      }
    }

    await unidad.update(req.body);

    return ok(
      res,
      unidad,
      'Unidad de medida actualizada'
    );
  } catch (err) {
    return next(err);
  }
};

exports.eliminar = async (req, res, next) => {
  try {
    const unidad = await UnidadMedida.findByPk(req.params.id);

    if (!unidad) {
      return fail(res, 'Unidad de medida no encontrada', 404);
    }

    await unidad.destroy();

    return ok(
      res,
      null,
      'Unidad de medida eliminada'
    );
  } catch (err) {
    return next(err);
  }
};