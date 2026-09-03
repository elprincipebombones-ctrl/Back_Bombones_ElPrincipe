const {
  DetalleRecepcion,
  Recepcion,
  Producto,
  UnidadMedida
} = require('../../models');

const { ok, created, fail } = require('../../utils/response');


// =====================================================
// LISTAR DETALLES DE UNA RECEPCIÓN
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

    const detalles = await DetalleRecepcion.findAll({
      where: {
        recepcionId
      },
      include: [
        {
          model: Producto,
          as: 'producto'
        },
        {
          model: UnidadMedida,
          as: 'unidadMedida'
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    return ok(res, detalles);

  } catch (err) {
    return next(err);
  }
};


// =====================================================
// OBTENER UN DETALLE
// =====================================================

exports.obtener = async (req, res, next) => {
  try {
    const detalle = await DetalleRecepcion.findByPk(
      req.params.id,
      {
        include: [
          {
            model: Producto,
            as: 'producto'
          },
          {
            model: UnidadMedida,
            as: 'unidadMedida'
          },
          {
            model: Recepcion,
            as: 'recepcion'
          }
        ]
      }
    );

    if (!detalle) {
      return fail(
        res,
        'Detalle de recepción no encontrado',
        404
      );
    }

    return ok(res, detalle);

  } catch (err) {
    return next(err);
  }
};


// =====================================================
// CREAR DETALLE
// =====================================================

exports.crear = async (req, res, next) => {
  try {
    const { recepcionId } = req.params;

    const {
      productoId,
      unidadMedidaId,
      cantidad,
      lote,
      fechaVencimiento,
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
    // VALIDACIONES
    // ---------------------------------------------

    if (!productoId) {
      return fail(
        res,
        'Falta el producto',
        400
      );
    }

    if (!unidadMedidaId) {
      return fail(
        res,
        'Falta la unidad de medida',
        400
      );
    }

    if (
      cantidad === undefined ||
      cantidad === null ||
      cantidad === ''
    ) {
      return fail(
        res,
        'Falta la cantidad',
        400
      );
    }

    if (Number(cantidad) <= 0) {
      return fail(
        res,
        'La cantidad debe ser mayor que cero',
        400
      );
    }


    // ---------------------------------------------
    // VALIDAR PRODUCTO
    // ---------------------------------------------

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
    // VALIDAR UNIDAD DE MEDIDA
    // ---------------------------------------------

    const unidadMedida = await UnidadMedida.findByPk(
      unidadMedidaId
    );

    if (!unidadMedida) {
      return fail(
        res,
        'Unidad de medida no encontrada',
        404
      );
    }


    // ---------------------------------------------
    // CREAR DETALLE
    // ---------------------------------------------

    const detalle = await DetalleRecepcion.create({
      recepcionId,
      productoId,
      unidadMedidaId,
      cantidad,
      lote,
      fechaVencimiento,
      observaciones
    });


    // ---------------------------------------------
    // DEVOLVER CON RELACIONES
    // ---------------------------------------------

    const detalleCreado =
      await DetalleRecepcion.findByPk(
        detalle.id,
        {
          include: [
            {
              model: Producto,
              as: 'producto'
            },
            {
              model: UnidadMedida,
              as: 'unidadMedida'
            }
          ]
        }
      );

    return created(
      res,
      detalleCreado
    );

  } catch (err) {
    return next(err);
  }
};


// =====================================================
// ACTUALIZAR DETALLE
// =====================================================

exports.actualizar = async (req, res, next) => {
  try {
    const detalle = await DetalleRecepcion.findByPk(
      req.params.id
    );

    if (!detalle) {
      return fail(
        res,
        'Detalle de recepción no encontrado',
        404
      );
    }


    // ---------------------------------------------
    // VALIDAR CANTIDAD
    // ---------------------------------------------

    if (
      req.body.cantidad !== undefined &&
      Number(req.body.cantidad) <= 0
    ) {
      return fail(
        res,
        'La cantidad debe ser mayor que cero',
        400
      );
    }


    // ---------------------------------------------
    // VALIDAR PRODUCTO
    // ---------------------------------------------

    if (req.body.productoId) {
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
    // VALIDAR UNIDAD
    // ---------------------------------------------

    if (req.body.unidadMedidaId) {
      const unidadMedida =
        await UnidadMedida.findByPk(
          req.body.unidadMedidaId
        );

      if (!unidadMedida) {
        return fail(
          res,
          'Unidad de medida no encontrada',
          404
        );
      }
    }


    // ---------------------------------------------
    // ACTUALIZAR
    // ---------------------------------------------

    await detalle.update(req.body);

    return ok(
      res,
      detalle,
      'Detalle de recepción actualizado'
    );

  } catch (err) {
    return next(err);
  }
};


// =====================================================
// ELIMINAR DETALLE
// =====================================================

exports.eliminar = async (req, res, next) => {
  try {
    const detalle = await DetalleRecepcion.findByPk(
      req.params.id
    );

    if (!detalle) {
      return fail(
        res,
        'Detalle de recepción no encontrado',
        404
      );
    }

    await detalle.destroy();

    return ok(
      res,
      null,
      'Detalle de recepción eliminado'
    );

  } catch (err) {
    return next(err);
  }
};