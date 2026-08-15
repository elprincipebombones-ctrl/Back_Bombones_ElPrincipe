const  Vehiculo  = require('../../models/Recepcion/Vehiculo');
const Proveedor = require('../../models/Recepcion/Proveedor');

const { ok, created, fail } = require('../../utils/response');

exports.listar = async (req, res, next) => {
  try {

    const vehiculos = await Vehiculo.findAll({
      include: [
        {
          model: Proveedor,
          as: 'proveedor',
          attributes: [
            'id',
            'razonSocial',
            'numeroDocumento'
          ]
        }
      ],
      order: [['codigo', 'ASC']]
    });

    return ok(res, vehiculos);

  } catch (err) {
    return next(err);
  }
};

exports.obtener = async (req, res, next) => {
  try {

    const vehiculo = await Vehiculo.findByPk(req.params.id, {
      include: [
        {
          model: Proveedor,
          as: 'proveedor',
          attributes: [
            'id',
            'razonSocial',
            'numeroDocumento'
          ]
        }
      ]
    });

    if (!vehiculo) {
      return fail(res, 'Vehículo no encontrado', 404);
    }

    return ok(res, vehiculo);

  } catch (err) {
    return next(err);
  }
};

exports.crear = async (req, res, next) => {
  try {

    const {
      codigo,
      placa,
      tipoVehiculo,
      marca,
      modelo,
      capacidadKg,
      proveedorId,
      descripcion,
      estado
    } = req.body;

    if (!codigo) {
      return fail(res, 'Falta el código', 400);
    }

    if (!placa) {
      return fail(res, 'Falta la placa', 400);
    }

    if (!tipoVehiculo) {
      return fail(res, 'Falta el tipo de vehículo', 400);
    }

    if (!proveedorId) {
      return fail(res, 'Debe seleccionar un proveedor', 400);
    }

    const proveedor = await Proveedor.findByPk(proveedorId);

    if (!proveedor) {
      return fail(res, 'El proveedor seleccionado no existe', 404);
    }

    const vehiculo = await Vehiculo.create({
      codigo,
      placa,
      tipoVehiculo,
      marca,
      modelo,
      capacidadKg,
      proveedorId,
      descripcion,
      estado
    });

    return created(res, vehiculo);

  } catch (err) {
    return next(err);
  }
};

exports.actualizar = async (req, res, next) => {
  try {

    const vehiculo = await Vehiculo.findByPk(req.params.id);

    if (!vehiculo) {
      return fail(res, 'Vehículo no encontrado', 404);
    }

    if (req.body.proveedorId) {

      const proveedor = await Proveedor.findByPk(req.body.proveedorId);

      if (!proveedor) {
        return fail(res, 'El proveedor seleccionado no existe', 404);
      }

    }

    await vehiculo.update(req.body);

    return ok(res, vehiculo, 'Vehículo actualizado');

  } catch (err) {
    return next(err);
  }
};

exports.eliminar = async (req, res, next) => {
  try {

    const vehiculo = await Vehiculo.findByPk(req.params.id);

    if (!vehiculo) {
      return fail(res, 'Vehículo no encontrado', 404);
    }

    await vehiculo.destroy();

    return ok(res, null, 'Vehículo eliminado');

  } catch (err) {
    return next(err);
  }
};