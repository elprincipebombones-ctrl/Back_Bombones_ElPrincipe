const {
  ResultadoRecepcion,
  Recepcion
} = require('../../models');

const { ok, created, fail } = require('../../utils/response');


// =====================================================
// OBTENER RESULTADO POR RECEPCIÓN
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

    const resultado =
      await ResultadoRecepcion.findOne({
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

    if (!resultado) {
      return fail(
        res,
        'Resultado de recepción no encontrado',
        404
      );
    }

    return ok(res, resultado);

  } catch (err) {
    return next(err);
  }
};


// =====================================================
// OBTENER RESULTADO POR ID
// =====================================================

exports.obtener = async (req, res, next) => {
  try {
    const resultado =
      await ResultadoRecepcion.findByPk(
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

    if (!resultado) {
      return fail(
        res,
        'Resultado de recepción no encontrado',
        404
      );
    }

    return ok(res, resultado);

  } catch (err) {
    return next(err);
  }
};


// =====================================================
// CREAR RESULTADO
// =====================================================

exports.crear = async (req, res, next) => {
  try {
    const { recepcionId } = req.params;

    const {
      resultado,
      observaciones,
      fechaDecision
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
    // VALIDAR RESULTADO
    // ---------------------------------------------

    if (!resultado) {
      return fail(
        res,
        'El resultado es obligatorio',
        400
      );
    }


    // ---------------------------------------------
    // EVITAR DUPLICADO
    // ---------------------------------------------

    const existente =
      await ResultadoRecepcion.findOne({
        where: {
          recepcionId
        }
      });

    if (existente) {
      return fail(
        res,
        'La recepción ya tiene un resultado registrado',
        409
      );
    }


    // ---------------------------------------------
    // CREAR
    // ---------------------------------------------

    const nuevoResultado =
      await ResultadoRecepcion.create({
        recepcionId,
        resultado,
        observaciones,
        fechaDecision
      });


    // ---------------------------------------------
    // DEVOLVER CON RECEPCIÓN
    // ---------------------------------------------

    const resultadoCreado =
      await ResultadoRecepcion.findByPk(
        nuevoResultado.id,
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
      resultadoCreado
    );

  } catch (err) {
    return next(err);
  }
};


// =====================================================
// ACTUALIZAR RESULTADO
// =====================================================

exports.actualizar = async (req, res, next) => {
  try {
    const resultado =
      await ResultadoRecepcion.findByPk(
        req.params.id
      );

    if (!resultado) {
      return fail(
        res,
        'Resultado de recepción no encontrado',
        404
      );
    }


    // ---------------------------------------------
    // VALIDAR RESULTADO SI VIENE EN LA PETICIÓN
    // ---------------------------------------------

    if (
      req.body.resultado !== undefined &&
      !req.body.resultado
    ) {
      return fail(
        res,
        'El resultado no puede estar vacío',
        400
      );
    }


    // ---------------------------------------------
    // ACTUALIZAR
    // ---------------------------------------------

    await resultado.update(req.body);

    return ok(
      res,
      resultado,
      'Resultado de recepción actualizado'
    );

  } catch (err) {
    return next(err);
  }
};


// =====================================================
// ELIMINAR RESULTADO
// =====================================================

exports.eliminar = async (req, res, next) => {
  try {
    const resultado =
      await ResultadoRecepcion.findByPk(
        req.params.id
      );

    if (!resultado) {
      return fail(
        res,
        'Resultado de recepción no encontrado',
        404
      );
    }

    await resultado.destroy();

    return ok(
      res,
      null,
      'Resultado de recepción eliminado'
    );

  } catch (err) {
    return next(err);
  }
};