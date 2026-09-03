const {
  TemperaturaRecepcion,
  Recepcion,
  Producto
} = require('../../models');

const { ok, created, fail } = require('../../utils/response');


// =====================================================
// LISTAR TEMPERATURAS DE UNA RECEPCIÓN
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

    const temperaturas =
      await TemperaturaRecepcion.findAll({
        where: {
          recepcionId
        },
        include: [
          {
            model: Producto,
            as: 'producto'
          }
        ],
        order: [['createdAt', 'ASC']]
      });

    return ok(res, temperaturas);

  } catch (err) {
    return next(err);
  }
};


// =====================================================
// OBTENER TEMPERATURA POR ID
// =====================================================

exports.obtener = async (req, res, next) => {
  try {
    const temperatura =
      await TemperaturaRecepcion.findByPk(
        req.params.id,
        {
          include: [
            {
              model: Recepcion,
              as: 'recepcion'
            },
            {
              model: Producto,
              as: 'producto'
            }
          ]
        }
      );

    if (!temperatura) {
      return fail(
        res,
        'Registro de temperatura no encontrado',
        404
      );
    }

    return ok(res, temperatura);

  } catch (err) {
    return next(err);
  }
};


// =====================================================
// CREAR TEMPERATURA
// =====================================================

exports.crear = async (req, res, next) => {
  try {
    const { recepcionId } = req.params;

    const {
      productoId,
      temperatura,
      hora,
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
    // VALIDAR PRODUCTO
    // ---------------------------------------------

    if (!productoId) {
      return fail(
        res,
        'Falta el producto',
        400
      );
    }

    const producto = await Producto.findByPk(
      productoId
    );

    if (!producto) {
      return fail(
        res,
        'Producto no encontrado',
        404
      );
    }


    // ---------------------------------------------
    // VALIDAR TEMPERATURA
    // ---------------------------------------------

    if (temperatura === undefined || temperatura === null) {
      return fail(
        res,
        'Falta la temperatura',
        400
      );
    }


    // ---------------------------------------------
    // CREAR
    // ---------------------------------------------

    const registro =
      await TemperaturaRecepcion.create({
        recepcionId,
        productoId,
        temperatura,
        hora,
        observaciones
      });


    // ---------------------------------------------
    // DEVOLVER CON PRODUCTO
    // ---------------------------------------------

    const registroCreado =
      await TemperaturaRecepcion.findByPk(
        registro.id,
        {
          include: [
            {
              model: Producto,
              as: 'producto'
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
// ACTUALIZAR TEMPERATURA
// =====================================================

exports.actualizar = async (req, res, next) => {
  try {
    const registro =
      await TemperaturaRecepcion.findByPk(
        req.params.id
      );

    if (!registro) {
      return fail(
        res,
        'Registro de temperatura no encontrado',
        404
      );
    }


    // ---------------------------------------------
    // VALIDAR PRODUCTO SI CAMBIA
    // ---------------------------------------------

    if (
      req.body.productoId &&
      req.body.productoId !== registro.productoId
    ) {
      const producto = await Producto.findByPk(
        req.body.productoId
      );

      if (!producto) {
        return fail(
          res,
          'Producto no encontrado',
          404
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
      'Registro de temperatura actualizado'
    );

  } catch (err) {
    return next(err);
  }
};


// =====================================================
// ELIMINAR TEMPERATURA
// =====================================================

exports.eliminar = async (req, res, next) => {
  try {
    const registro =
      await TemperaturaRecepcion.findByPk(
        req.params.id
      );

    if (!registro) {
      return fail(
        res,
        'Registro de temperatura no encontrado',
        404
      );
    }

    await registro.destroy();

    return ok(
      res,
      null,
      'Registro de temperatura eliminado'
    );

  } catch (err) {
    return next(err);
  }
};