const LugarArea = require('../../models/Recepcion/LugarArea');
const { ok, created, fail } = require('../../utils/response');

exports.listar = async (req, res, next) => {
  try {
    const lugaresAreas = await LugarArea.findAll({
      order: [['nombre', 'ASC']]
    });

    return ok(res, lugaresAreas);
  } catch (err) {
    return next(err);
  }
};

exports.obtener = async (req, res, next) => {
  try {
    const lugarArea = await LugarArea.findByPk(req.params.id);

    if (!lugarArea) {
      return fail(res, 'Lugar o área no encontrado', 404);
    }

    return ok(res, lugarArea);
  } catch (err) {
    return next(err);
  }
};

exports.crear = async (req, res, next) => {
  try {
    const {
      nombre,
      codigo,
      tipo,
      descripcion,
      estado
    } = req.body;

    if (!nombre) {
      return fail(res, 'Falta el nombre', 400);
    }

    if (!codigo) {
      return fail(res, 'Falta el código', 400);
    }

    if (!tipo) {
      return fail(res, 'Falta el tipo', 400);
    }

    const lugarAreaPorCodigo = await LugarArea.findOne({
      where: {
        codigo
      }
    });

    if (lugarAreaPorCodigo) {
      return fail(
        res,
        'Ya existe un lugar o área con ese código',
        409
      );
    }

    const lugarArea = await LugarArea.create({
      nombre,
      codigo,
      tipo,
      descripcion,
      estado: estado !== undefined ? estado : true
    });

    return created(res, lugarArea);
  } catch (err) {
    return next(err);
  }
};

exports.actualizar = async (req, res, next) => {
  try {
    const lugarArea = await LugarArea.findByPk(req.params.id);

    if (!lugarArea) {
      return fail(res, 'Lugar o área no encontrado', 404);
    }

    if (
      req.body.codigo &&
      req.body.codigo !== lugarArea.codigo
    ) {
      const lugarAreaPorCodigo = await LugarArea.findOne({
        where: {
          codigo: req.body.codigo
        }
      });

      if (
        lugarAreaPorCodigo &&
        lugarAreaPorCodigo.id !== lugarArea.id
      ) {
        return fail(
          res,
          'Ya existe un lugar o área con ese código',
          409
        );
      }
    }

    await lugarArea.update(req.body);

    return ok(
      res,
      lugarArea,
      'Lugar o área actualizado'
    );
  } catch (err) {
    return next(err);
  }
};

exports.eliminar = async (req, res, next) => {
  try {
    const lugarArea = await LugarArea.findByPk(req.params.id);

    if (!lugarArea) {
      return fail(res, 'Lugar o área no encontrado', 404);
    }

    await lugarArea.destroy();

    return ok(
      res,
      null,
      'Lugar o área eliminado'
    );
  } catch (err) {
    return next(err);
  }
};