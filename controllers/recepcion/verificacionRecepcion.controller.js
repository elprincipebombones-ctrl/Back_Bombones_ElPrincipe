const {
  VerificacionRecepcion,
  Recepcion
} = require('../../models');

const { ok, created, fail } = require('../../utils/response');


// =====================================================
// OBTENER VERIFICACIÓN DE UNA RECEPCIÓN
// =====================================================

exports.obtenerPorRecepcion = async (req, res, next) => {
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

    const verificacion =
      await VerificacionRecepcion.findOne({
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

    if (!verificacion) {
      return fail(
        res,
        'Verificación de recepción no encontrada',
        404
      );
    }

    return ok(res, verificacion);

  } catch (err) {
    return next(err);
  }
};


// =====================================================
// OBTENER VERIFICACIÓN POR ID
// =====================================================

exports.obtener = async (req, res, next) => {
  try {
    const verificacion =
      await VerificacionRecepcion.findByPk(
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

    if (!verificacion) {
      return fail(
        res,
        'Verificación de recepción no encontrada',
        404
      );
    }

    return ok(res, verificacion);

  } catch (err) {
    return next(err);
  }
};


// =====================================================
// CREAR VERIFICACIÓN
// =====================================================

exports.crear = async (req, res, next) => {
  try {
    const { recepcionId } = req.params;

    const {
      certificadoCalidad,
      plagas,
      rotuladoCorrecto,
      condicionesEmbalaje,
      aparienciaColorTextura,
      empaqueEmbalaje,
      olor
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
    // VERIFICAR QUE NO EXISTA
    // ---------------------------------------------

    const existente =
      await VerificacionRecepcion.findOne({
        where: {
          recepcionId
        }
      });

    if (existente) {
      return fail(
        res,
        'La recepción ya tiene una verificación registrada',
        409
      );
    }


    // ---------------------------------------------
    // CREAR
    // ---------------------------------------------

    const verificacion =
      await VerificacionRecepcion.create({
        recepcionId,
        certificadoCalidad,
        plagas,
        rotuladoCorrecto,
        condicionesEmbalaje,
        aparienciaColorTextura,
        empaqueEmbalaje,
        olor
      });


    // ---------------------------------------------
    // DEVOLVER CON RECEPCIÓN
    // ---------------------------------------------

    const verificacionCreada =
      await VerificacionRecepcion.findByPk(
        verificacion.id,
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
      verificacionCreada
    );

  } catch (err) {
    return next(err);
  }
};


// =====================================================
// ACTUALIZAR VERIFICACIÓN
// =====================================================

exports.actualizar = async (req, res, next) => {
  try {
    const verificacion =
      await VerificacionRecepcion.findByPk(
        req.params.id
      );

    if (!verificacion) {
      return fail(
        res,
        'Verificación de recepción no encontrada',
        404
      );
    }


    // ---------------------------------------------
    // ACTUALIZAR
    // ---------------------------------------------

    await verificacion.update(req.body);

    return ok(
      res,
      verificacion,
      'Verificación de recepción actualizada'
    );

  } catch (err) {
    return next(err);
  }
};


// =====================================================
// ELIMINAR VERIFICACIÓN
// =====================================================

exports.eliminar = async (req, res, next) => {
  try {
    const verificacion =
      await VerificacionRecepcion.findByPk(
        req.params.id
      );

    if (!verificacion) {
      return fail(
        res,
        'Verificación de recepción no encontrada',
        404
      );
    }

    await verificacion.destroy();

    return ok(
      res,
      null,
      'Verificación de recepción eliminada'
    );

  } catch (err) {
    return next(err);
  }
};