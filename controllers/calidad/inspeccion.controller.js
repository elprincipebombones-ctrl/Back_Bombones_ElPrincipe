const { Op } = require('sequelize');
const {
  sequelize,
  Inspeccion,
  VersionFormato,
  FormatoCalidad,
  LugarInspeccion,
  CategoriaLugarInspeccion,
  Usuario,
  Desviacion,
} = require('../../models');
const { ok, created, fail } = require('../../utils/response');
const { ApiError } = require('../../utils/ApiError');
const {
  obtenerCompleta,
  camposObligatoriosPendientes,
  bloqueosCierre,
} = require('../../services/calidad/inspecciones.service');
const {
  fechaActual,
  cerrarSiVencida,
  cerrarVencidas,
  validarEditable,
} = require('../../services/calidad/bloqueo-diario.service');

const dato = (body, camel, snake) => body[camel] ?? body[snake];
const includeBasico = [
  { model: VersionFormato, as: 'version', include: [{ model: FormatoCalidad, as: 'formato' }] },
  {
    model: LugarInspeccion,
    as: 'lugarInspeccion',
    include: [{ model: CategoriaLugarInspeccion, as: 'categoria' }],
  },
  { model: Usuario, as: 'iniciador', attributes: ['id', 'nombre', 'correo'] },
];

exports.crear = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const formatoCalidadId = dato(req.body, 'formatoCalidadId', 'formato_calidad_id');
    const lugarInspeccionId = dato(req.body, 'lugarInspeccionId', 'lugar_inspeccion_id');
    const version = await VersionFormato.findOne({
      where: { formatoCalidadId, estadoVersion: 'PUBLICADO' },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!version) throw new ApiError('El formato no tiene una versión PUBLICADA', 409);
    const lugar = await LugarInspeccion.findOne({
      where: { id: lugarInspeccionId, estado: true },
      include: [
        {
          model: CategoriaLugarInspeccion,
          as: 'categoria',
          where: { estado: true },
          required: true,
        },
      ],
      transaction,
    });
    if (!lugar) {
      throw new ApiError('Selecciona un lugar activo para iniciar la inspección', 422);
    }
    const fechaInspeccion = await fechaActual(transaction);
    const inspeccion = await Inspeccion.create(
      {
        versionFormatoId: version.id,
        lugarInspeccionId,
        fechaInspeccion,
        observaciones: req.body.observaciones ?? null,
        estado: 'EN_PROCESO',
        iniciadaPor: req.usuario.id,
        fechaInicio: new Date(),
      },
      { transaction },
    );
    const creada = await Inspeccion.findByPk(inspeccion.id, {
      include: includeBasico,
      transaction,
    });
    await transaction.commit();
    return created(res, creada);
  } catch (error) {
    await transaction.rollback();
    return next(error);
  }
};

exports.listar = async (req, res, next) => {
  try {
    await cerrarVencidas();
    const where = {};
    if (req.query.estado) where.estado = req.query.estado;
    if (req.query.fecha_desde || req.query.fecha_hasta) {
      where.fechaInspeccion = {};
      if (req.query.fecha_desde) where.fechaInspeccion[Op.gte] = req.query.fecha_desde;
      if (req.query.fecha_hasta) where.fechaInspeccion[Op.lte] = req.query.fecha_hasta;
    }
    const inspecciones = await Inspeccion.findAll({
      where,
      include: includeBasico,
      order: [['fechaInicio', 'DESC']],
    });
    const hoy = new Date().toISOString().slice(0, 10);
    return ok(
      res,
      inspecciones.map((registro) => ({
        ...registro.toJSON(),
        vencida: registro.estado !== 'CERRADA' && registro.fechaInspeccion < hoy,
      })),
    );
  } catch (error) {
    return next(error);
  }
};

exports.pendientes = async (_req, res, next) => {
  try {
    await cerrarVencidas();
    const hoy = await fechaActual();
    const inspecciones = await Inspeccion.findAll({
      where: {
        [Op.or]: [
          { estado: 'PENDIENTE_ACCION' },
          { fechaInspeccion: { [Op.lt]: hoy }, estado: 'CERRADA_INCOMPLETA' },
        ],
      },
      include: includeBasico,
      order: [['fechaInspeccion', 'ASC']],
    });
    return ok(
      res,
      inspecciones.map((registro) => ({ ...registro.toJSON(), vencida: true })),
    );
  } catch (error) {
    return next(error);
  }
};

exports.obtener = async (req, res, next) => {
  try {
    const inspeccion = await Inspeccion.findByPk(req.params.id, { include: includeBasico });
    if (!inspeccion) return fail(res, 'Inspección no encontrada', 404);
    await cerrarSiVencida(inspeccion);
    return ok(res, inspeccion);
  } catch (error) {
    return next(error);
  }
};

exports.obtenerCompleta = async (req, res, next) => {
  try {
    const base = await Inspeccion.findByPk(req.params.id);
    if (!base) return fail(res, 'Inspección no encontrada', 404);
    await cerrarSiVencida(base);
    const inspeccion = await obtenerCompleta(req.params.id);
    return ok(res, inspeccion);
  } catch (error) {
    return next(error);
  }
};

exports.actualizar = async (req, res, next) => {
  try {
    const inspeccion = await Inspeccion.findByPk(req.params.id);
    if (!inspeccion) return fail(res, 'Inspección no encontrada', 404);
    await validarEditable(inspeccion);
    const lugarInspeccionId = dato(req.body, 'lugarInspeccionId', 'lugar_inspeccion_id');
    if (lugarInspeccionId !== undefined && lugarInspeccionId !== inspeccion.lugarInspeccionId) {
      return fail(res, 'El lugar no se puede cambiar después de iniciar la inspección', 409);
    }
    await inspeccion.update({
      ...(req.body.observaciones !== undefined ? { observaciones: req.body.observaciones } : {}),
    });
    return ok(res, inspeccion, 'Inspección actualizada');
  } catch (error) {
    return next(error);
  }
};

exports.completar = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const inspeccion = await Inspeccion.findByPk(req.params.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!inspeccion) throw new ApiError('Inspección no encontrada', 404);
    await validarEditable(inspeccion, transaction);
    const pendientes = await camposObligatoriosPendientes(inspeccion, transaction);
    if (pendientes.length) {
      throw new ApiError('Faltan campos obligatorios por responder', 400, pendientes);
    }
    const desviaciones = await Desviacion.count({
      where: { inspeccionId: inspeccion.id, estado: { [Op.ne]: 'CERRADA' } },
      transaction,
    });
    await inspeccion.update(
      {
        estado: desviaciones ? 'PENDIENTE_ACCION' : 'EN_PROCESO',
        fechaCompletada: new Date(),
      },
      { transaction },
    );
    await transaction.commit();
    return ok(res, inspeccion, 'Inspección completada');
  } catch (error) {
    await transaction.rollback();
    return next(error);
  }
};

exports.cerrar = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const inspeccion = await Inspeccion.findByPk(req.params.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!inspeccion) throw new ApiError('Inspección no encontrada', 404);
    if (inspeccion.estado === 'CERRADA') throw new ApiError('La inspección ya está cerrada', 409);
    if (inspeccion.estado === 'CERRADA_INCOMPLETA') {
      throw new ApiError('Una inspección incompleta de un día anterior no puede cerrarse', 409);
    }
    const hoy = await fechaActual(transaction);
    if (inspeccion.fechaInspeccion < hoy && inspeccion.estado !== 'PENDIENTE_ACCION') {
      throw new ApiError('La inspección pertenece a un día anterior', 409);
    }
    const bloqueos = await bloqueosCierre(inspeccion, transaction);
    if (bloqueos.pendientes.length) {
      throw new ApiError('Faltan campos obligatorios o elementos de checklist', 409, bloqueos);
    }
    if (bloqueos.desviacionesAbiertas || bloqueos.accionesAbiertas) {
      await inspeccion.update({ estado: 'PENDIENTE_ACCION' }, { transaction });
      await transaction.commit();
      return fail(
        res,
        'La inspección queda pendiente hasta cerrar sus desviaciones y acciones correctivas',
        409,
        bloqueos,
      );
    }
    await inspeccion.update(
      { estado: 'CERRADA', cerradaPor: req.usuario.id, fechaCierre: new Date() },
      { transaction },
    );
    await transaction.commit();
    return ok(res, inspeccion, 'Inspección cerrada');
  } catch (error) {
    await transaction.rollback();
    return next(error);
  }
};
