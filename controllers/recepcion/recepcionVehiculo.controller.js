const {
  RecepcionVehiculo,
  Recepcion,
  Vehiculo
} = require('../../models');

const { ok, created, fail } = require('../../utils/response');


// =====================================================
// LISTAR VEHÍCULOS DE UNA RECEPCIÓN
// =====================================================

exports.listar = async (req, res, next) => {
  try {
    const { recepcionId } = req.params;

    const recepcion = await Recepcion.findByPk(recepcionId);

    if (!recepcion) {
      return fail(
        res,
        'Recepción no encontrada',
        404
      );
    }

    const vehiculos = await RecepcionVehiculo.findAll({
      where: {
        recepcionId
      },
      include: [
        {
          model: Vehiculo,
          as: 'vehiculo'
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    return ok(res, vehiculos);

  } catch (err) {
    return next(err);
  }
};


// =====================================================
// OBTENER REGISTRO VEHÍCULO
// =====================================================

exports.obtener = async (req, res, next) => {
  try {
    const registro = await RecepcionVehiculo.findByPk(
      req.params.id,
      {
        include: [
          {
            model: Recepcion,
            as: 'recepcion'
          },
          {
            model: Vehiculo,
            as: 'vehiculo'
          }
        ]
      }
    );

    if (!registro) {
      return fail(
        res,
        'Registro de vehículo de recepción no encontrado',
        404
      );
    }

    return ok(res, registro);

  } catch (err) {
    return next(err);
  }
};


// =====================================================
// CREAR REGISTRO VEHÍCULO
// =====================================================

exports.crear = async (req, res, next) => {
  try {
    const { recepcionId } = req.params;

    const {
      vehiculoId,
      temperatura,
      precinto,
      guiaTransporte,
      hora,
      vehiculoConductorOk
    } = req.body;


    // ---------------------------------------------
    // VALIDAR RECEPCIÓN
    // ---------------------------------------------

    const recepcion = await Recepcion.findByPk(
      recepcionId
    );

    if (!recepcion) {
      return fail(
        res,
        'Recepción no encontrada',
        404
      );
    }


    // ---------------------------------------------
    // VALIDAR VEHÍCULO
    // ---------------------------------------------

    if (!vehiculoId) {
      return fail(
        res,
        'Falta el vehículo',
        400
      );
    }

    const vehiculo = await Vehiculo.findByPk(
      vehiculoId
    );

    if (!vehiculo) {
      return fail(
        res,
        'Vehículo no encontrado',
        404
      );
    }


    // ---------------------------------------------
    // EVITAR DUPLICAR EL MISMO VEHÍCULO
    // ---------------------------------------------

    const registroExistente =
      await RecepcionVehiculo.findOne({
        where: {
          recepcionId,
          vehiculoId
        }
      });

    if (registroExistente) {
      return fail(
        res,
        'El vehículo ya está registrado en esta recepción',
        409
      );
    }


    // ---------------------------------------------
    // CREAR
    // ---------------------------------------------

    const registro = await RecepcionVehiculo.create({
      recepcionId,
      vehiculoId,
      temperatura,
      precinto,
      guiaTransporte,
      hora,
      vehiculoConductorOk
    });


    // ---------------------------------------------
    // DEVOLVER CON VEHÍCULO
    // ---------------------------------------------

    const registroCreado =
      await RecepcionVehiculo.findByPk(
        registro.id,
        {
          include: [
            {
              model: Vehiculo,
              as: 'vehiculo'
            }
          ]
        }
      );

    return created(
      res,
      registroCreado
    );

  } catch (err) {
    return next(err);
  }
};


// =====================================================
// ACTUALIZAR REGISTRO VEHÍCULO
// =====================================================

exports.actualizar = async (req, res, next) => {
  try {
    const registro =
      await RecepcionVehiculo.findByPk(
        req.params.id
      );

    if (!registro) {
      return fail(
        res,
        'Registro de vehículo de recepción no encontrado',
        404
      );
    }


    // ---------------------------------------------
    // VALIDAR VEHÍCULO SI CAMBIA
    // ---------------------------------------------

    if (
      req.body.vehiculoId &&
      req.body.vehiculoId !== registro.vehiculoId
    ) {
      const vehiculo = await Vehiculo.findByPk(
        req.body.vehiculoId
      );

      if (!vehiculo) {
        return fail(
          res,
          'Vehículo no encontrado',
          404
        );
      }


      // -------------------------------------------
      // EVITAR DUPLICADO
      // -------------------------------------------

      const existente =
        await RecepcionVehiculo.findOne({
          where: {
            recepcionId: registro.recepcionId,
            vehiculoId: req.body.vehiculoId
          }
        });

      if (
        existente &&
        existente.id !== registro.id
      ) {
        return fail(
          res,
          'El vehículo ya está registrado en esta recepción',
          409
        );
      }
    }


    // ---------------------------------------------
    // ACTUALIZAR
    // ---------------------------------------------

    await registro.update(req.body);

    return ok(
      res,
      registro,
      'Registro de vehículo actualizado'
    );

  } catch (err) {
    return next(err);
  }
};


// =====================================================
// ELIMINAR REGISTRO VEHÍCULO
// =====================================================

exports.eliminar = async (req, res, next) => {
  try {
    const registro =
      await RecepcionVehiculo.findByPk(
        req.params.id
      );

    if (!registro) {
      return fail(
        res,
        'Registro de vehículo de recepción no encontrado',
        404
      );
    }

    await registro.destroy();

    return ok(
      res,
      null,
      'Registro de vehículo eliminado'
    );

  } catch (err) {
    return next(err);
  }
};