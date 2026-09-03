const { Op } = require('sequelize');

const Recepcion = require('../../models/Recepcion/Recepcion');
const DetalleRecepcion = require('../../models/Recepcion/DetalleRecepcion');
const RecepcionVehiculo = require('../../models/Recepcion/RecepcionVehiculo');
const VerificacionRecepcion = require('../../models/Recepcion/VerificacionRecepcion');
const TemperaturaRecepcion = require('../../models/Recepcion/TemperaturaRecepcion');
const CondicionAmbientalRecepcion = require('../../models/Recepcion/CondicionAmbientalRecepcion');
const ResultadoRecepcion = require('../../models/Recepcion/ResultadoRecepcion');

const Proveedor = require('../../models/Recepcion/Proveedor');
const Producto = require('../../models/Recepcion/Producto');
const UnidadMedida = require('../../models/Recepcion/UnidadMedida');
const Vehiculo = require('../../models/Recepcion/Vehiculo');
const Bodega = require('../../models/Inventario/Bodega');
const LugarArea = require('../../models/Recepcion/LugarArea');

const { ok, created, fail } = require('../../utils/response');


// =====================================================
// LISTAR
// =====================================================

exports.listar = async (req, res, next) => {
  try {

    const recepciones = await Recepcion.findAll({
      include: [
        {
          model: Proveedor,
          as: 'proveedor'
        },
        {
          model: Bodega,
          as: 'bodega'
        },
        {
          model: LugarArea,
          as: 'lugarArea'
        }
      ],
      order: [
        ['fechaRecepcion', 'DESC']
      ]
    });

    return ok(res, recepciones);

  } catch (err) {
    return next(err);
  }
};


// =====================================================
// OBTENER
// =====================================================

exports.obtener = async (req, res, next) => {
  try {

    const recepcion = await Recepcion.findByPk(
      req.params.id,
      {
        include: [
          {
            model: Proveedor,
            as: 'proveedor'
          },
          {
            model: Bodega,
            as: 'bodega'
          },
          {
            model: LugarArea,
            as: 'lugarArea'
          },
          {
            model: DetalleRecepcion,
            as: 'detalles',
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
          },
          {
            model: RecepcionVehiculo,
            as: 'vehiculos',
            include: [
              {
                model: Vehiculo,
                as: 'vehiculo'
              }
            ]
          },
          {
            model: VerificacionRecepcion,
            as: 'verificacion'
          },
          {
            model: TemperaturaRecepcion,
            as: 'temperaturas',
            include: [
              {
                model: Producto,
                as: 'producto'
              }
            ]
          },
          {
            model: CondicionAmbientalRecepcion,
            as: 'condicionAmbiental'
          },
          {
            model: ResultadoRecepcion,
            as: 'resultado'
          }
        ]
      }
    );

    if (!recepcion) {
      return fail(
        res,
        'Recepción no encontrada',
        404
      );
    }

    return ok(res, recepcion);

  } catch (err) {
    return next(err);
  }
};


// =====================================================
// CREAR
// =====================================================

exports.crear = async (req, res, next) => {
  try {

    const {
      numero,
      fechaRecepcion,
      proveedorId,
      bodegaId,
      lugarAreaId,
      estado,
      observaciones,
      usuarioRecepcionId
    } = req.body;


    // ---------------------------------------------
    // Validaciones básicas
    // ---------------------------------------------

    if (!numero) {
      return fail(
        res,
        'Falta el número de recepción',
        400
      );
    }

    if (!fechaRecepcion) {
      return fail(
        res,
        'Falta la fecha de recepción',
        400
      );
    }

    if (!proveedorId) {
      return fail(
        res,
        'Falta el proveedor',
        400
      );
    }


    // ---------------------------------------------
    // Número único
    // ---------------------------------------------

    const existeNumero = await Recepcion.findOne({
      where: {
        numero
      }
    });

    if (existeNumero) {
      return fail(
        res,
        'Ya existe una recepción con ese número',
        409
      );
    }


    // ---------------------------------------------
    // Crear
    // ---------------------------------------------

    const recepcion = await Recepcion.create({
      numero,
      fechaRecepcion,
      proveedorId,
      bodegaId,
      lugarAreaId,
      estado: estado || 'PENDIENTE',
      observaciones,
      usuarioRecepcionId
    });

    return created(
      res,
      recepcion
    );

  } catch (err) {
    return next(err);
  }
};


// =====================================================
// ACTUALIZAR
// =====================================================

exports.actualizar = async (req, res, next) => {
  try {

    const recepcion = await Recepcion.findByPk(
      req.params.id
    );

    if (!recepcion) {
      return fail(
        res,
        'Recepción no encontrada',
        404
      );
    }


    // ---------------------------------------------
    // Validar número duplicado
    // ---------------------------------------------

    if (
      req.body.numero &&
      req.body.numero !== recepcion.numero
    ) {

      const existeNumero = await Recepcion.findOne({
        where: {
          numero: req.body.numero,
          id: {
            [Op.ne]: recepcion.id
          }
        }
      });

      if (existeNumero) {
        return fail(
          res,
          'Ya existe una recepción con ese número',
          409
        );
      }
    }


    await recepcion.update(req.body);

    return ok(
      res,
      recepcion,
      'Recepción actualizada'
    );

  } catch (err) {
    return next(err);
  }
};


// =====================================================
// ELIMINAR
// =====================================================

exports.eliminar = async (req, res, next) => {
  try {

    const recepcion = await Recepcion.findByPk(
      req.params.id
    );

    if (!recepcion) {
      return fail(
        res,
        'Recepción no encontrada',
        404
      );
    }

    await recepcion.destroy();

    return ok(
      res,
      null,
      'Recepción eliminada'
    );

  } catch (err) {
    return next(err);
  }
};