const { Op } = require('sequelize');
const {
  sequelize,
  ProgramacionFormato,
  DiaProgramacion,
  FormatoCalidad,
  VersionFormato,
  Inspeccion,
} = require('../../models');
const { ok, created, fail } = require('../../utils/response');
const { ApiError } = require('../../utils/ApiError');

const include = [
  { model: FormatoCalidad, as: 'formato' },
  { model: DiaProgramacion, as: 'dias' },
];

const normalizarDias = (dias) => [...new Set((dias || []).map(Number))].sort((a, b) => a - b);

const sincronizarDias = async (programacionId, dias, transaction) => {
  const valores = normalizarDias(dias);
  if (!valores.length) throw new ApiError('Debes seleccionar al menos un día', 422);
  if (valores.some((dia) => dia < 1 || dia > 7))
    throw new ApiError('Día de programación inválido', 422);
  await DiaProgramacion.destroy({ where: { programacionFormatoId: programacionId }, transaction });
  await DiaProgramacion.bulkCreate(
    valores.map((diaSemana) => ({ programacionFormatoId: programacionId, diaSemana })),
    { transaction },
  );
};

exports.listar = async (req, res, next) => {
  try {
    const where = req.query.formato_id ? { formatoCalidadId: req.query.formato_id } : {};
    return ok(
      res,
      await ProgramacionFormato.findAll({ where, include, order: [['fechaInicio', 'DESC']] }),
    );
  } catch (error) {
    return next(error);
  }
};

exports.obtener = async (req, res, next) => {
  try {
    const programacion = await ProgramacionFormato.findByPk(req.params.id, { include });
    return programacion ? ok(res, programacion) : fail(res, 'Programación no encontrada', 404);
  } catch (error) {
    return next(error);
  }
};

exports.crear = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const formato = await FormatoCalidad.findByPk(req.body.formatoCalidadId, { transaction });
    if (!formato) throw new ApiError('Formato no encontrado', 422);
    const programacion = await ProgramacionFormato.create(
      {
        formatoCalidadId: formato.id,
        fechaInicio: req.body.fechaInicio,
        fechaFin: req.body.fechaFin || null,
        horaProgramada: req.body.horaProgramada || null,
        activo: req.body.activo ?? true,
      },
      { transaction },
    );
    await sincronizarDias(programacion.id, req.body.dias, transaction);
    await transaction.commit();
    return created(
      res,
      await ProgramacionFormato.findByPk(programacion.id, { include }),
      'Programación creada',
    );
  } catch (error) {
    await transaction.rollback();
    return next(error);
  }
};

exports.actualizar = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const programacion = await ProgramacionFormato.findByPk(req.params.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!programacion) throw new ApiError('Programación no encontrada', 404);
    const fechaInicio = req.body.fechaInicio ?? programacion.fechaInicio;
    const fechaFin =
      req.body.fechaFin === undefined ? programacion.fechaFin : req.body.fechaFin || null;
    if (fechaFin && fechaFin < fechaInicio)
      throw new ApiError('La fecha fin no puede ser anterior al inicio', 422);
    await programacion.update(
      {
        ...(req.body.fechaInicio !== undefined ? { fechaInicio: req.body.fechaInicio } : {}),
        ...(req.body.fechaFin !== undefined ? { fechaFin: req.body.fechaFin || null } : {}),
        ...(req.body.horaProgramada !== undefined
          ? { horaProgramada: req.body.horaProgramada || null }
          : {}),
        ...(req.body.activo !== undefined ? { activo: req.body.activo } : {}),
      },
      { transaction },
    );
    if (req.body.dias) await sincronizarDias(programacion.id, req.body.dias, transaction);
    await transaction.commit();
    return ok(
      res,
      await ProgramacionFormato.findByPk(programacion.id, { include }),
      'Programación actualizada',
    );
  } catch (error) {
    await transaction.rollback();
    return next(error);
  }
};

exports.pendientes = async (req, res, next) => {
  try {
    const fecha = req.query.fecha;
    const fechaUtc = new Date(`${fecha}T12:00:00.000Z`);
    const diaSemana = fechaUtc.getUTCDay() || 7;
    const programaciones = await ProgramacionFormato.findAll({
      where: {
        activo: true,
        fechaInicio: { [Op.lte]: fecha },
        [Op.or]: [{ fechaFin: null }, { fechaFin: { [Op.gte]: fecha } }],
      },
      include: [
        { model: DiaProgramacion, as: 'dias', where: { diaSemana }, required: true },
        {
          model: FormatoCalidad,
          as: 'formato',
          where: { estado: true },
          required: true,
          include: [
            {
              model: VersionFormato,
              as: 'versiones',
              where: { estadoVersion: 'PUBLICADO' },
              required: true,
            },
          ],
        },
      ],
      order: [['horaProgramada', 'ASC']],
    });
    const versionIds = programaciones.map((item) => item.formato.versiones[0].id);
    const inspecciones = versionIds.length
      ? await Inspeccion.findAll({
          where: { versionFormatoId: versionIds, fechaInspeccion: fecha },
        })
      : [];
    const porVersion = new Map(inspecciones.map((item) => [item.versionFormatoId, item]));
    return ok(
      res,
      programaciones.map((item) => {
        const data = item.toJSON();
        const version = data.formato.versiones[0];
        return {
          ...data,
          versionPublicada: version,
          inspeccion: porVersion.get(version.id) || null,
        };
      }),
    );
  } catch (error) {
    return next(error);
  }
};
