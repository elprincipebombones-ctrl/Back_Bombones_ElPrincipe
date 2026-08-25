const {
  CondicionAmbientalRecepcion,
  Recepcion
} = require('../../models');

const { ok, created, fail } = require('../../utils/response');


// =====================================================
// OBTENER CONDICIÓN AMBIENTAL POR RECEPCIÓN
// =====================================================

exports.obtenerPorRecepcion = async (req, res, next) => {
  try {
    const { recepcionId } = req.params;

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

    const condicion =
      await CondicionAmbientalRecepcion.findOne({
        where: {
          recepcionId
        },
        include: [
          {
            model: Recepcion,
            as: 'recepcion'
          }
        ]
      });

    if (!condicion) {
      return fail(
        res,
        'Condición ambiental de recepción no encontrada',
        404
      );
    }

    return ok(res, condicion);

  } catch (err) {
    return next(err);
  }
};


// =====================================================
// OBTENER CONDICIÓN AMBIENTAL POR ID
// =====================================================

exports.obtener = async (req, res, next) => {
  try {
    const condicion =
      await CondicionAmbientalRecepcion.findByPk(
        req.params.id,
        {
          include: [
            {
              model: Recepcion,
              as: 'recepcion'
            }
          ]
        }
      );

    if (!condicion) {
      return fail(
        res,
        'Condición ambiental de recepción no encontrada',
        404
      );
    }

    return ok(res, condicion);

  } catch (err) {
    return next(err);
  }
};


// =====================================================
// CREAR CONDICIÓN AMBIENTAL
// =====================================================

exports.crear = async (req, res, next) => {
  try {
    const { recepcionId } = req.params;

    const {
      temperatura,
      desinfeccionRealizada,
      productoDesinfeccion,
      concentracionDesinfeccion,
      observaciones
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
    // EVITAR DUPLICADO
    // ---------------------------------------------

    const existente =
      await CondicionAmbientalRecepcion.findOne({
        where: {
          recepcionId
        }
      });

    if (existente) {
      return fail(
        res,
        'La recepción ya tiene una condición ambiental registrada',
        409
      );
    }


    // ---------------------------------------------
    // CREAR
    // ---------------------------------------------

    const condicion =
      await CondicionAmbientalRecepcion.create({
        recepcionId,
        temperatura,
        desinfeccionRealizada,
        productoDesinfeccion,
        concentracionDesinfeccion,
        observaciones
      });


    // ---------------------------------------------
    // DEVOLVER CON RECEPCIÓN
    // ---------------------------------------------

    const condicionCreada =
      await CondicionAmbientalRecepcion.findByPk(
        condicion.id,
        {
          include: [
            {
              model: Recepcion,
              as: 'recepcion'
            }
          ]
        }
      );

    return created(
      res,
      condicionCreada
    );

  } catch (err) {
    return next(err);
  }
};


// =====================================================
// ACTUALIZAR CONDICIÓN AMBIENTAL
// =====================================================

exports.actualizar = async (req, res, next) => {
  try {
    const condicion =
      await CondicionAmbientalRecepcion.findByPk(
        req.params.id
      );

    if (!condicion) {
      return fail(
        res,
        'Condición ambiental de recepción no encontrada',
        404
      );
    }


    // ---------------------------------------------
    // ACTUALIZAR
    // ---------------------------------------------

    await condicion.update(req.body);

    return ok(
      res,
      condicion,
      'Condición ambiental actualizada'
    );

  } catch (err) {
    return next(err);
  }
};


// =====================================================
// ELIMINAR CONDICIÓN AMBIENTAL
// =====================================================

exports.eliminar = async (req, res, next) => {
  try {
    const condicion =
      await CondicionAmbientalRecepcion.findByPk(
        req.params.id
      );

    if (!condicion) {
      return fail(
        res,
        'Condición ambiental de recepción no encontrada',
        404
      );
    }

    await condicion.destroy();

    return ok(
      res,
      null,
      'Condición ambiental eliminada'
    );

  } catch (err) {
    return next(err);
  }
};