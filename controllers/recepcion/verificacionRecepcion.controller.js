const sequelize = require('../../database/database');
const { Recepcion, VerificacionRecepcion, AccionMejoraRecepcion } = require('../../models');
const { ok, created, fail } = require('../../utils/response');

const CAMPOS = [
  'certificadoCalidad',
  'plagas',
  'rotuladoCorrecto',
  'condicionesEmbalaje',
  'aparienciaColorTextura',
  'empaqueEmbalaje',
  'olor',
];

const recepcionEditable = async (recepcionId, transaction) => {
  const recepcion = await Recepcion.findByPk(recepcionId, { transaction });
  if (!recepcion) return { error: 'Recepción no encontrada', status: 404 };
  if (recepcion.estado !== 'EN_PROCESO') {
    return { error: 'La recepción finalizada es de solo lectura', status: 409 };
  }
  return { recepcion };
};

const observacionesPorControl = (novedades = []) =>
  new Map(
    novedades
      .map((novedad) => [novedad.control, String(novedad.observacion || '').trim()])
      .filter(([, observacion]) => observacion),
  );

const guardarVerificacion = async ({ recepcion, registro, body, transaction }) => {
  const valores = Object.fromEntries(
    CAMPOS.map((campo) => [campo, body[campo] ?? registro?.[campo] ?? true]),
  );
  const observaciones = observacionesPorControl(body.novedades);
  const existentes = await AccionMejoraRecepcion.findAll({
    where: { recepcionId: recepcion.id, origen: 'VERIFICACION' },
    transaction,
  });
  const existentesPorControl = new Map(existentes.map((accion) => [accion.control, accion]));

  for (const campo of CAMPOS) {
    const existente = existentesPorControl.get(campo);
    if (valores[campo]) {
      if (existente) await existente.destroy({ transaction });
      continue;
    }

    const observacion = observaciones.has(campo)
      ? observaciones.get(campo)
      : existente?.observacion || '';

    if (existente) {
      if (observaciones.has(campo)) {
        await existente.update({ observacion }, { transaction });
      }
    } else {
      await AccionMejoraRecepcion.create(
        {
          recepcionId: recepcion.id,
          origen: 'VERIFICACION',
          control: campo,
          afectacion: 'RECEPCION_COMPLETA',
          observacion,
          decision: null,
          estado: 'PENDIENTE',
        },
        { transaction },
      );
    }
  }

  const tieneNovedades =
    (await AccionMejoraRecepcion.count({
      where: { recepcionId: recepcion.id },
      transaction,
    })) > 0;
  await recepcion.update({ tieneNovedades }, { transaction });
  if (registro) {
    await registro.update(valores, { transaction });
    return registro;
  }
  return VerificacionRecepcion.create({ ...valores, recepcionId: recepcion.id }, { transaction });
};

exports.obtener = async (req, res, next) => {
  try {
    const registro = await VerificacionRecepcion.findOne({
      where: { recepcionId: req.params.recepcionId },
    });
    return registro ? ok(res, registro) : fail(res, 'Verificación de recepción no encontrada', 404);
  } catch (error) {
    return next(error);
  }
};

exports.crear = async (req, res, next) => {
  try {
    const registro = await sequelize.transaction(async (transaction) => {
      const estado = await recepcionEditable(req.params.recepcionId, transaction);
      if (estado.error) {
        const error = new Error(estado.error);
        error.status = estado.status;
        throw error;
      }
      const existente = await VerificacionRecepcion.findOne({
        where: { recepcionId: estado.recepcion.id },
        transaction,
      });
      if (existente) {
        const error = new Error('La recepción ya tiene verificación de recepción');
        error.status = 409;
        throw error;
      }
      return guardarVerificacion({
        recepcion: estado.recepcion,
        registro: null,
        body: req.body,
        transaction,
      });
    });
    return created(res, registro);
  } catch (error) {
    return next(error);
  }
};

exports.actualizar = async (req, res, next) => {
  try {
    const registro = await sequelize.transaction(async (transaction) => {
      const estado = await recepcionEditable(req.params.recepcionId, transaction);
      if (estado.error) {
        const error = new Error(estado.error);
        error.status = estado.status;
        throw error;
      }
      const existente = await VerificacionRecepcion.findOne({
        where: { recepcionId: estado.recepcion.id },
        transaction,
      });
      if (!existente) {
        const error = new Error('Verificación de recepción no encontrada');
        error.status = 404;
        throw error;
      }
      return guardarVerificacion({
        recepcion: estado.recepcion,
        registro: existente,
        body: req.body,
        transaction,
      });
    });
    return ok(res, registro, 'Verificación de recepción actualizada');
  } catch (error) {
    return next(error);
  }
};

exports.eliminar = async (req, res, next) => {
  try {
    await sequelize.transaction(async (transaction) => {
      const estado = await recepcionEditable(req.params.recepcionId, transaction);
      if (estado.error) {
        const error = new Error(estado.error);
        error.status = estado.status;
        throw error;
      }
      const registro = await VerificacionRecepcion.findOne({
        where: { recepcionId: estado.recepcion.id },
        transaction,
      });
      if (!registro) {
        const error = new Error('Verificación de recepción no encontrada');
        error.status = 404;
        throw error;
      }
      await AccionMejoraRecepcion.destroy({
        where: { recepcionId: estado.recepcion.id, origen: 'VERIFICACION' },
        transaction,
      });
      await registro.destroy({ transaction });
      const tieneNovedades =
        (await AccionMejoraRecepcion.count({
          where: { recepcionId: estado.recepcion.id },
          transaction,
        })) > 0;
      await estado.recepcion.update({ tieneNovedades }, { transaction });
    });
    return ok(res, null, 'Verificación de recepción eliminada');
  } catch (error) {
    return next(error);
  }
};
