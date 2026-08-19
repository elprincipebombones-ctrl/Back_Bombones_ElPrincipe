const db = require('../../models');

const {
  sequelize,
  Recepcion,
  DetalleRecepcion,
  RecepcionVehiculo,
  VerificacionRecepcion,
  TemperaturaRecepcion,
  CondicionAmbientalRecepcion,
  ResultadoRecepcion,
  Proveedor,
  Vehiculo,
  LugarArea,
  Producto,
  MateriaPrima
} = db;


// ============================================================
// INCLUDES
// ============================================================

const includesRecepcion = [
  {
    model: Proveedor,
    as: 'proveedor',
    attributes: ['id', 'razonSocial', 'numeroDocumento']
  },
  {
    model: DetalleRecepcion,
    as: 'detalles',
    include: [
      {
        model: Producto,
        as: 'producto',
        attributes: ['id', 'codigo', 'nombre']
      },
      {
        model: MateriaPrima,
        as: 'materiaPrima',
        attributes: ['id', 'codigo', 'nombre']
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
    as: 'verificacionRecepcion'
  },
  {
    model: TemperaturaRecepcion,
    as: 'temperaturas',
    include: [
      {
        model: Producto,
        as: 'producto',
        attributes: ['id', 'codigo', 'nombre']
      }
    ]
  },
  {
    model: CondicionAmbientalRecepcion,
    as: 'condicionAmbiental'
  },
  {
    model: ResultadoRecepcion,
    as: 'resultadoRecepcion'
  }
];


// ============================================================
// OBTENER TODAS LAS RECEPCIONES
// ============================================================

// ============================================================
// LISTAR RECEPCIONES
// ============================================================

const getAll = async (req, res) => {
  try {
    const recepciones = await Recepcion.findAll({
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Proveedor,
          as: 'proveedor',
          attributes: ['id', 'razonSocial', 'numeroDocumento']
        },
        {
          model: LugarArea,
          as: 'lugarArea',
          attributes: ['id', 'codigo', 'nombre', 'tipo']
        },
        {
          model: Usuario,
          as: 'usuarioRecepcion',
          attributes: ['id', 'nombre', 'apellido']
        },
        {
          model: DetalleRecepcion,
          as: 'detalles',
          include: [
            {
              model: Producto,
              as: 'producto',
              attributes: ['id', 'codigo', 'nombre', 'unidadMedida']
            },
            {
              model: MateriaPrima,
              as: 'materiaPrima',
              attributes: ['id', 'codigo', 'nombre', 'unidadMedida']
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
          as: 'verificacionRecepcion'
        },
        {
          model: TemperaturaRecepcion,
          as: 'temperaturas',
          include: [
            {
              model: Producto,
              as: 'producto',
              attributes: ['id', 'codigo', 'nombre']
            }
          ]
        },
        {
          model: CondicionAmbientalRecepcion,
          as: 'condicionAmbiental'
        },
        {
          model: ResultadoRecepcion,
          as: 'resultadoRecepcion',
          include: [
            {
              model: Usuario,
              as: 'usuarioDecision',
              attributes: ['id', 'nombre', 'apellido']
            }
          ]
        }
      ]
    });

    return res.status(200).json({
      success: true,
      message: 'Recepciones obtenidas correctamente.',
      data: recepciones
    });
  } catch (error) {
    console.error('Error obteniendo recepciones:', error);

    return res.status(500).json({
      success: false,
      message: 'Error obteniendo las recepciones.',
      error: error.message
    });
  }
};

// ============================================================
// OBTENER RECEPCIÓN POR ID
// ============================================================

// ============================================================
// OBTENER RECEPCIÓN POR ID
// ============================================================

const getById = async (req, res) => {
  try {
    const { id } = req.params;

    const recepcion = await Recepcion.findByPk(id, {
      include: [
        {
          model: Proveedor,
          as: 'proveedor'
        },
        {
          model: LugarArea,
          as: 'lugarArea'
        },
        {
          model: Usuario,
          as: 'usuarioRecepcion',
          attributes: ['id', 'nombre', 'apellido']
        },
        {
          model: Usuario,
          as: 'usuarioVerificacion',
          attributes: ['id', 'nombre', 'apellido']
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
              model: MateriaPrima,
              as: 'materiaPrima'
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
          as: 'verificacionRecepcion'
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
          as: 'resultadoRecepcion',
          include: [
            {
              model: Usuario,
              as: 'usuarioDecision',
              attributes: ['id', 'nombre', 'apellido']
            }
          ]
        }
      ]
    });

    if (!recepcion) {
      return res.status(404).json({
        success: false,
        message: 'Recepción no encontrada.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Recepción obtenida correctamente.',
      data: recepcion
    });
  } catch (error) {
    console.error('Error obteniendo recepción:', error);

    return res.status(500).json({
      success: false,
      message: 'Error obteniendo la recepción.',
      error: error.message
    });
  }
};

// ============================================================
// CREAR RECEPCIÓN
// ============================================================

const create = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      numeroRecepcion,
      tipoRecepcion,
      fechaRecepcion,
      horaRecepcion,
      proveedorId,
      lugarAreaId,
      lote,
      observaciones,
      estado = true,
      detalles = [],
      vehiculo,
      verificacionRecepcion,
      temperaturas = [],
      condicionAmbiental,
      resultadoRecepcion
    } = req.body;


    // --------------------------------------------------------
    // VALIDACIONES
    // --------------------------------------------------------

    if (!numeroRecepcion) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: 'El número de recepción es obligatorio.'
      });
    }

    if (!tipoRecepcion) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: 'El tipo de recepción es obligatorio.'
      });
    }

    if (!fechaRecepcion) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: 'La fecha de recepción es obligatoria.'
      });
    }

    if (!proveedorId) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: 'El proveedor es obligatorio.'
      });
    }


    // --------------------------------------------------------
    // VALIDAR PROVEEDOR
    // --------------------------------------------------------

    const proveedor = await Proveedor.findByPk(proveedorId, {
      transaction
    });

    if (!proveedor) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message: 'El proveedor seleccionado no existe.'
      });
    }


    // --------------------------------------------------------
    // VALIDAR LUGAR / ÁREA
    // --------------------------------------------------------

    if (lugarAreaId) {
      const lugarArea = await LugarArea.findByPk(lugarAreaId, {
        transaction
      });

      if (!lugarArea) {
        await transaction.rollback();

        return res.status(404).json({
          success: false,
          message: 'El lugar o área seleccionado no existe.'
        });
      }
    }


    // --------------------------------------------------------
    // VALIDAR NÚMERO DE RECEPCIÓN
    // --------------------------------------------------------

    const existente = await Recepcion.findOne({
      where: {
        numeroRecepcion
      },
      transaction
    });

    if (existente) {
      await transaction.rollback();

      return res.status(409).json({
        success: false,
        message: 'Ya existe una recepción con ese número.'
      });
    }


    // --------------------------------------------------------
    // CREAR RECEPCIÓN
    // --------------------------------------------------------

    const recepcion = await Recepcion.create(
      {
        numeroRecepcion,
        tipoRecepcion,
        fechaRecepcion,
        horaRecepcion,
        proveedorId,
        lugarAreaId,
        lote,
        observaciones,
        estado
      },
      {
        transaction
      }
    );


    // --------------------------------------------------------
    // CREAR DETALLES
    // --------------------------------------------------------

    if (Array.isArray(detalles) && detalles.length > 0) {

      for (const detalle of detalles) {

        if (!detalle.unidadMedida) {
          throw new Error(
            'La unidad de medida es obligatoria en cada detalle.'
          );
        }

        if (
          detalle.productoId &&
          detalle.materiaPrimaId
        ) {
          throw new Error(
            'Un detalle no puede tener producto y materia prima al mismo tiempo.'
          );
        }

        if (
          !detalle.productoId &&
          !detalle.materiaPrimaId
        ) {
          throw new Error(
            'Cada detalle debe tener un producto o una materia prima.'
          );
        }


        // ----------------------------------------------
        // VALIDAR PRODUCTO
        // ----------------------------------------------

        if (detalle.productoId) {

          const producto = await Producto.findByPk(
            detalle.productoId,
            { transaction }
          );

          if (!producto) {
            throw new Error(
              `El producto ${detalle.productoId} no existe.`
            );
          }
        }


        // ----------------------------------------------
        // VALIDAR MATERIA PRIMA
        // ----------------------------------------------

        if (detalle.materiaPrimaId) {

          const materiaPrima = await MateriaPrima.findByPk(
            detalle.materiaPrimaId,
            { transaction }
          );

          if (!materiaPrima) {
            throw new Error(
              `La materia prima ${detalle.materiaPrimaId} no existe.`
            );
          }
        }


        await DetalleRecepcion.create(
          {
            recepcionId: recepcion.id,
            productoId: detalle.productoId || null,
            materiaPrimaId: detalle.materiaPrimaId || null,
            unidadMedida: detalle.unidadMedida,
            cantidadSolicitada:
              detalle.cantidadSolicitada ?? null,
            cantidadRecibida:
              detalle.cantidadRecibida,
            fechaVencimiento:
              detalle.fechaVencimiento || null,
            lote:
              detalle.lote || null,
            loteProveedor:
              detalle.loteProveedor || null
          },
          {
            transaction
          }
        );
      }
    }


    // --------------------------------------------------------
    // VEHÍCULO DE RECEPCIÓN
    // --------------------------------------------------------

    if (vehiculo) {

      if (!vehiculo.vehiculoId) {
        throw new Error(
          'El vehículo de recepción debe tener vehiculoId.'
        );
      }

      const vehiculoExiste = await Vehiculo.findByPk(
        vehiculo.vehiculoId,
        { transaction }
      );

      if (!vehiculoExiste) {
        throw new Error(
          'El vehículo seleccionado no existe.'
        );
      }

      await RecepcionVehiculo.create(
        {
          recepcionId: recepcion.id,
          vehiculoId: vehiculo.vehiculoId,
          temperatura: vehiculo.temperatura ?? null,
          precinto: vehiculo.precinto || null,
          guiaTransporte: vehiculo.guiaTransporte || null,
          hora: vehiculo.hora || null,
          vehiculoConductorOk:
            vehiculo.vehiculoConductorOk ?? null
        },
        {
          transaction
        }
      );
    }


    // --------------------------------------------------------
    // VERIFICACIÓN DE RECEPCIÓN
    // --------------------------------------------------------

    if (verificacionRecepcion) {

      await VerificacionRecepcion.create(
        {
          ...verificacionRecepcion,
          recepcionId: recepcion.id
        },
        {
          transaction
        }
      );
    }


    // --------------------------------------------------------
    // TEMPERATURAS DE PRODUCTOS
    // --------------------------------------------------------

    if (
      Array.isArray(temperaturas) &&
      temperaturas.length > 0
    ) {

      for (const temperatura of temperaturas) {

        if (!temperatura.productoId) {
          throw new Error(
            'Cada temperatura debe estar asociada a un producto.'
          );
        }

        const producto = await Producto.findByPk(
          temperatura.productoId,
          { transaction }
        );

        if (!producto) {
          throw new Error(
            `El producto ${temperatura.productoId} no existe.`
          );
        }

        await TemperaturaRecepcion.create(
          {
            recepcionId: recepcion.id,
            productoId: temperatura.productoId,
            temperatura: temperatura.temperatura,
            hora: temperatura.hora || null,
            observaciones:
              temperatura.observaciones || null
          },
          {
            transaction
          }
        );
      }
    }


    // --------------------------------------------------------
    // CONDICIONES AMBIENTALES
    // --------------------------------------------------------

    if (condicionAmbiental) {

      await CondicionAmbientalRecepcion.create(
        {
          ...condicionAmbiental,
          recepcionId: recepcion.id
        },
        {
          transaction
        }
      );
    }


    // --------------------------------------------------------
    // RESULTADO
    // --------------------------------------------------------

    if (resultadoRecepcion) {

      if (!resultadoRecepcion.resultado) {
        throw new Error(
          'El resultado de la recepción es obligatorio.'
        );
      }

      await ResultadoRecepcion.create(
        {
          ...resultadoRecepcion,
          recepcionId: recepcion.id
        },
        {
          transaction
        }
      );
    }


    // --------------------------------------------------------
    // CONFIRMAR TRANSACCIÓN
    // --------------------------------------------------------

    await transaction.commit();


    // --------------------------------------------------------
    // DEVOLVER RECEPCIÓN COMPLETA
    // --------------------------------------------------------

    const resultado = await Recepcion.findByPk(
      recepcion.id,
      {
        include: includesRecepcion
      }
    );

    return res.status(201).json({
      success: true,
      message: 'Recepción creada correctamente.',
      data: resultado
    });

  } catch (error) {

    await transaction.rollback();

    console.error('Error creando recepción:', error);

    return res.status(500).json({
      success: false,
      message: error.message ||
        'Error creando la recepción.',
      error: error.message
    });
  }
};


// ============================================================
// ACTUALIZAR RECEPCIÓN
// ============================================================

const update = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    const recepcion = await Recepcion.findByPk(id, {
      transaction
    });

    if (!recepcion) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message: 'Recepción no encontrada.'
      });
    }


    const {
      numeroRecepcion,
      tipoRecepcion,
      fechaRecepcion,
      horaRecepcion,
      proveedorId,
      lugarAreaId,
      lote,
      observaciones,
      estado,
      detalles,
      vehiculo,
      verificacionRecepcion,
      temperaturas,
      condicionAmbiental,
      resultadoRecepcion
    } = req.body;


    // --------------------------------------------------------
    // ACTUALIZAR CABECERA
    // --------------------------------------------------------

    await recepcion.update(
      {
        numeroRecepcion:
          numeroRecepcion ?? recepcion.numeroRecepcion,

        tipoRecepcion:
          tipoRecepcion ?? recepcion.tipoRecepcion,

        fechaRecepcion:
          fechaRecepcion ?? recepcion.fechaRecepcion,

        horaRecepcion:
          horaRecepcion ?? recepcion.horaRecepcion,

        proveedorId:
          proveedorId ?? recepcion.proveedorId,

        lugarAreaId:
          lugarAreaId ?? recepcion.lugarAreaId,

        lote:
          lote ?? recepcion.lote,

        observaciones:
          observaciones ?? recepcion.observaciones,

        estado:
          estado ?? recepcion.estado
      },
      {
        transaction
      }
    );


    // --------------------------------------------------------
    // DETALLES
    // --------------------------------------------------------

    if (Array.isArray(detalles)) {

      await DetalleRecepcion.destroy({
        where: {
          recepcionId: id
        },
        transaction
      });

      for (const detalle of detalles) {

        if (
          !detalle.productoId &&
          !detalle.materiaPrimaId
        ) {
          throw new Error(
            'Cada detalle debe tener un producto o una materia prima.'
          );
        }

        if (
          detalle.productoId &&
          detalle.materiaPrimaId
        ) {
          throw new Error(
            'Un detalle no puede tener producto y materia prima al mismo tiempo.'
          );
        }

        await DetalleRecepcion.create(
          {
            recepcionId: id,
            productoId:
              detalle.productoId || null,
            materiaPrimaId:
              detalle.materiaPrimaId || null,
            unidadMedida:
              detalle.unidadMedida,
            cantidadSolicitada:
              detalle.cantidadSolicitada ?? null,
            cantidadRecibida:
              detalle.cantidadRecibida,
            fechaVencimiento:
              detalle.fechaVencimiento || null,
            lote:
              detalle.lote || null,
            loteProveedor:
              detalle.loteProveedor || null
          },
          {
            transaction
          }
        );
      }
    }


    // --------------------------------------------------------
    // VEHÍCULO
    // --------------------------------------------------------

    if (vehiculo) {

      await RecepcionVehiculo.destroy({
        where: {
          recepcionId: id
        },
        transaction
      });

      await RecepcionVehiculo.create(
        {
          recepcionId: id,
          vehiculoId: vehiculo.vehiculoId,
          temperatura:
            vehiculo.temperatura ?? null,
          precinto:
            vehiculo.precinto || null,
          guiaTransporte:
            vehiculo.guiaTransporte || null,
          hora:
            vehiculo.hora || null,
          vehiculoConductorOk:
            vehiculo.vehiculoConductorOk ?? null
        },
        {
          transaction
        }
      );
    }


    // --------------------------------------------------------
    // VERIFICACIÓN
    // --------------------------------------------------------

    if (verificacionRecepcion) {

      const verificacion =
        await VerificacionRecepcion.findOne({
          where: {
            recepcionId: id
          },
          transaction
        });

      if (verificacion) {

        await verificacion.update(
          verificacionRecepcion,
          {
            transaction
          }
        );

      } else {

        await VerificacionRecepcion.create(
          {
            ...verificacionRecepcion,
            recepcionId: id
          },
          {
            transaction
          }
        );
      }
    }


    // --------------------------------------------------------
    // TEMPERATURAS
    // --------------------------------------------------------

    if (Array.isArray(temperaturas)) {

      await TemperaturaRecepcion.destroy({
        where: {
          recepcionId: id
        },
        transaction
      });

      for (const temperatura of temperaturas) {

        await TemperaturaRecepcion.create(
          {
            recepcionId: id,
            productoId:
              temperatura.productoId,
            temperatura:
              temperatura.temperatura,
            hora:
              temperatura.hora || null,
            observaciones:
              temperatura.observaciones || null
          },
          {
            transaction
          }
        );
      }
    }


    // --------------------------------------------------------
    // CONDICIÓN AMBIENTAL
    // --------------------------------------------------------

    if (condicionAmbiental) {

      const condicion =
        await CondicionAmbientalRecepcion.findOne({
          where: {
            recepcionId: id
          },
          transaction
        });

      if (condicion) {

        await condicion.update(
          condicionAmbiental,
          {
            transaction
          }
        );

      } else {

        await CondicionAmbientalRecepcion.create(
          {
            ...condicionAmbiental,
            recepcionId: id
          },
          {
            transaction
          }
        );
      }
    }


    // --------------------------------------------------------
    // RESULTADO
    // --------------------------------------------------------

    if (resultadoRecepcion) {

      const resultado =
        await ResultadoRecepcion.findOne({
          where: {
            recepcionId: id
          },
          transaction
        });

      if (resultado) {

        await resultado.update(
          resultadoRecepcion,
          {
            transaction
          }
        );

      } else {

        await ResultadoRecepcion.create(
          {
            ...resultadoRecepcion,
            recepcionId: id
          },
          {
            transaction
          }
        );
      }
    }


    await transaction.commit();


    const resultado = await Recepcion.findByPk(
      id,
      {
        include: includesRecepcion
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Recepción actualizada correctamente.',
      data: resultado
    });

  } catch (error) {

    await transaction.rollback();

    console.error(
      'Error actualizando recepción:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        'Error actualizando la recepción.',
      error: error.message
    });
  }
};


// ============================================================
// ELIMINAR RECEPCIÓN
// ============================================================

const remove = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    const recepcion = await Recepcion.findByPk(id, {
      transaction
    });

    if (!recepcion) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message: 'Recepción no encontrada.'
      });
    }


    // --------------------------------------------------------
    // ELIMINAR RELACIONES
    // --------------------------------------------------------

    await DetalleRecepcion.destroy({
      where: {
        recepcionId: id
      },
      transaction
    });

    await RecepcionVehiculo.destroy({
      where: {
        recepcionId: id
      },
      transaction
    });

    await VerificacionRecepcion.destroy({
      where: {
        recepcionId: id
      },
      transaction
    });

    await TemperaturaRecepcion.destroy({
      where: {
        recepcionId: id
      },
      transaction
    });

    await CondicionAmbientalRecepcion.destroy({
      where: {
        recepcionId: id
      },
      transaction
    });

    await ResultadoRecepcion.destroy({
      where: {
        recepcionId: id
      },
      transaction
    });


    // --------------------------------------------------------
    // ELIMINAR RECEPCIÓN
    // --------------------------------------------------------

    await recepcion.destroy({
      transaction
    });

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: 'Recepción eliminada correctamente.',
      data: null
    });

  } catch (error) {

    await transaction.rollback();

    console.error(
      'Error eliminando recepción:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        'Error eliminando la recepción.',
      error: error.message
    });
  }
};


// ============================================================
// EXPORTAR
// ============================================================

module.exports = {
  getAll,
  getById,
  create,
  update,
  delete: remove
};