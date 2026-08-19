const Proveedor = require('../../models/Recepcion/Proveedor');
const { ok, created, fail } = require('../../utils/response');

exports.listar = async (req, res, next) => {
  try {
    const proveedores = await Proveedor.findAll({
      order: [['razonSocial', 'ASC']]
    });

    return ok(res, proveedores);
  } catch (err) {
    return next(err);
  }
};

exports.obtener = async (req, res, next) => {
  try {
    const proveedor = await Proveedor.findByPk(req.params.id);

    if (!proveedor) {
      return fail(res, 'Proveedor no encontrado', 404);
    }

    return ok(res, proveedor);
  } catch (err) {
    return next(err);
  }
};

exports.crear = async (req, res, next) => {
  try {
    const {
      tipoDocumento,
      numeroDocumento,
      razonSocial,
      nombreComercial,
      telefono,
      email,
      direccion,
      ciudad,
      estado
    } = req.body;

    if (!tipoDocumento) {
      return fail(res, 'Falta el tipo de documento', 400);
    }

    if (!numeroDocumento) {
      return fail(res, 'Falta el número de documento', 400);
    }

    if (!razonSocial) {
      return fail(res, 'Falta la razón social', 400);
    }

    const proveedorExistente = await Proveedor.findOne({
      where: {
        numeroDocumento
      }
    });

    if (proveedorExistente) {
      return fail(
        res,
        'Ya existe un proveedor con ese número de documento',
        409
      );
    }

    const proveedor = await Proveedor.create({
      tipoDocumento,
      numeroDocumento,
      razonSocial,
      nombreComercial,
      telefono,
      email,
      direccion,
      ciudad,
      estado: estado !== undefined ? estado : true
    });

    return created(res, proveedor);
  } catch (err) {
    return next(err);
  }
};

exports.actualizar = async (req, res, next) => {
  try {
    const proveedor = await Proveedor.findByPk(req.params.id);

    if (!proveedor) {
      return fail(res, 'Proveedor no encontrado', 404);
    }

    if (
      req.body.numeroDocumento &&
      req.body.numeroDocumento !== proveedor.numeroDocumento
    ) {
      const proveedorExistente = await Proveedor.findOne({
        where: {
          numeroDocumento: req.body.numeroDocumento
        }
      });

      if (
        proveedorExistente &&
        proveedorExistente.id !== proveedor.id
      ) {
        return fail(
          res,
          'Ya existe un proveedor con ese número de documento',
          409
        );
      }
    }

    await proveedor.update(req.body);

    return ok(
      res,
      proveedor,
      'Proveedor actualizado'
    );
  } catch (err) {
    return next(err);
  }
};

exports.eliminar = async (req, res, next) => {
  try {
    const proveedor = await Proveedor.findByPk(req.params.id);

    if (!proveedor) {
      return fail(res, 'Proveedor no encontrado', 404);
    }

    await proveedor.destroy();

    return ok(
      res,
      null,
      'Proveedor eliminado'
    );
  } catch (err) {
    return next(err);
  }
};