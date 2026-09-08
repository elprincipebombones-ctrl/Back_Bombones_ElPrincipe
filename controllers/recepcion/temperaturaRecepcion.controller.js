const {
  Recepcion,
  DetalleRecepcion,
  TemperaturaRecepcion,
  AccionMejoraRecepcion,
  Producto,
  CategoriaProducto,
} = require('../../models');
const sequelize = require('../../database/database');
const { ok, created, fail } = require('../../utils/response');

const include = [
  { model: Producto, as: 'producto' },
  { model: DetalleRecepcion, as: 'detalleRecepcion' },
];

const buscar = (recepcionId, id) =>
  TemperaturaRecepcion.findOne({ where: { id, recepcionId }, include });

const editable = async (recepcionId) => {
  const recepcion = await Recepcion.findByPk(recepcionId);
  if (!recepcion) return { error: 'Recepción no encontrada', status: 404 };
  if (recepcion.estado !== 'EN_PROCESO') {
    return { error: 'La recepción finalizada es de solo lectura', status: 409 };
  }
  return { recepcion };
};

const buscarDetalle = (recepcionId, detalleRecepcionId) =>
  DetalleRecepcion.findOne({
    where: { id: detalleRecepcionId, recepcionId },
    include: [
      {
        model: Producto,
        as: 'producto',
        include: [{ model: CategoriaProducto, as: 'categoriaProducto' }],
      },
    ],
  });

const datosEditables = (body) => ({
  condicionTermica: Number(body.temperatura) <= 0 ? 'CONGELADO' : 'REFRIGERADO',
  temperatura: body.temperatura,
  hora: body.hora || null,
  observaciones: body.observaciones || null,
});

const sincronizarAccionTemperatura = async ({ recepcion, detalle, temperatura, transaction }) => {
  const control = `temperatura:${detalle.id}`;
  const existente = await AccionMejoraRecepcion.findOne({
    where: { recepcionId: recepcion.id, control },
    transaction,
  });

  if (Number(temperatura) > 4) {
    const observacion = `Temperatura fuera del rango permitido: ${Number(temperatura)} °C (máximo 4 °C).`;
    if (!existente) {
      await AccionMejoraRecepcion.create(
        {
          recepcionId: recepcion.id,
          detalleRecepcionId: detalle.id,
          origen: 'TEMPERATURA',
          control,
          afectacion: 'PRODUCTO',
          observacion,
          decision: null,
          estado: 'PENDIENTE',
        },
        { transaction },
      );
    } else if (existente.estado === 'PENDIENTE') {
      await existente.update({ observacion }, { transaction });
    }
  } else if (existente) {
    await existente.destroy({ transaction });
  }

  const tieneNovedades =
    (await AccionMejoraRecepcion.count({
      where: { recepcionId: recepcion.id },
      transaction,
    })) > 0;
  await recepcion.update({ tieneNovedades }, { transaction });
};

exports.listar = async (req, res, next) => {
  try {
    const recepcion = await Recepcion.findByPk(req.params.recepcionId);
    if (!recepcion) return fail(res, 'Recepción no encontrada', 404);
    return ok(
      res,
      await TemperaturaRecepcion.findAll({
        where: { recepcionId: recepcion.id },
        include,
        order: [['createdAt', 'ASC']],
      }),
    );
  } catch (err) {
    return next(err);
  }
};

exports.obtener = async (req, res, next) => {
  try {
    const registro = await buscar(req.params.recepcionId, req.params.id);
    return registro ? ok(res, registro) : fail(res, 'Temperatura no encontrada', 404);
  } catch (err) {
    return next(err);
  }
};

exports.crear = async (req, res, next) => {
  try {
    const estado = await editable(req.params.recepcionId);
    if (estado.error) return fail(res, estado.error, estado.status);

    const detalle = await buscarDetalle(req.params.recepcionId, req.body.detalleRecepcionId);
    if (!detalle) return fail(res, 'El detalle no pertenece a la recepción', 422);
    if (!detalle.producto?.categoriaProducto?.requiereTemperatura) {
      return fail(res, 'La categoría del producto no requiere control de temperatura', 422);
    }

    const duplicada = await TemperaturaRecepcion.findOne({
      where: {
        recepcionId: req.params.recepcionId,
        detalleRecepcionId: detalle.id,
      },
    });
    if (duplicada) return fail(res, 'El producto ya tiene una temperatura registrada', 409);

    const registro = await sequelize.transaction(async (transaction) => {
      const creado = await TemperaturaRecepcion.create(
        {
          ...datosEditables(req.body),
          recepcionId: req.params.recepcionId,
          detalleRecepcionId: detalle.id,
          productoId: detalle.productoId,
        },
        { transaction },
      );
      await sincronizarAccionTemperatura({
        recepcion: estado.recepcion,
        detalle,
        temperatura: creado.temperatura,
        transaction,
      });
      return creado;
    });
    return created(res, await buscar(req.params.recepcionId, registro.id));
  } catch (err) {
    return next(err);
  }
};

exports.actualizar = async (req, res, next) => {
  try {
    const estado = await editable(req.params.recepcionId);
    if (estado.error) return fail(res, estado.error, estado.status);
    const registro = await buscar(req.params.recepcionId, req.params.id);
    if (!registro) return fail(res, 'Temperatura no encontrada', 404);

    if (
      req.body.detalleRecepcionId &&
      registro.detalleRecepcionId &&
      req.body.detalleRecepcionId !== registro.detalleRecepcionId
    ) {
      return fail(res, 'No se puede cambiar el producto de una temperatura registrada', 422);
    }

    const detalleRecepcionId = registro.detalleRecepcionId || req.body.detalleRecepcionId;
    const detalle = await buscarDetalle(req.params.recepcionId, detalleRecepcionId);
    if (!detalle) {
      return fail(res, 'No fue posible relacionar la temperatura con el producto recibido', 422);
    }

    await sequelize.transaction(async (transaction) => {
      await registro.update(
        {
          ...datosEditables({ ...registro.toJSON(), ...req.body }),
          detalleRecepcionId: detalle.id,
          productoId: detalle.productoId,
        },
        { transaction },
      );
      await sincronizarAccionTemperatura({
        recepcion: estado.recepcion,
        detalle,
        temperatura: registro.temperatura,
        transaction,
      });
    });
    return ok(res, await buscar(req.params.recepcionId, registro.id), 'Temperatura actualizada');
  } catch (err) {
    return next(err);
  }
};

exports.eliminar = async (req, res, next) => {
  try {
    const estado = await editable(req.params.recepcionId);
    if (estado.error) return fail(res, estado.error, estado.status);
    const registro = await buscar(req.params.recepcionId, req.params.id);
    if (!registro) return fail(res, 'Temperatura no encontrada', 404);
    await sequelize.transaction(async (transaction) => {
      await AccionMejoraRecepcion.destroy({
        where: {
          recepcionId: req.params.recepcionId,
          control: `temperatura:${registro.detalleRecepcionId}`,
        },
        transaction,
      });
      await registro.destroy({ transaction });
      const tieneNovedades =
        (await AccionMejoraRecepcion.count({
          where: { recepcionId: req.params.recepcionId },
          transaction,
        })) > 0;
      await estado.recepcion.update({ tieneNovedades }, { transaction });
    });
    return ok(res, null, 'Temperatura eliminada');
  } catch (err) {
    return next(err);
  }
};
