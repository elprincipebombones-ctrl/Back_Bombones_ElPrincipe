const { Op } = require('sequelize');
const {
  sequelize,
  Inspeccion,
  VersionFormato,
  FormatoCalidad,
  LugarInspeccion,
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

const dato = (body, camel, snake) => body[camel] ?? body[snake];
const includeBasico = [
  { model: VersionFormato, as: 'version', include: [{ model: FormatoCalidad, as: 'formato' }] },
  { model: LugarInspeccion, as: 'lugarInspeccion' },
  { model: Usuario, as: 'iniciador', attributes: ['id', 'nombre', 'correo'] },
];

exports.crear = async (req, res, next) => {
  try {
    const versionFormatoId = dato(req.body, 'versionFormatoId', 'version_formato_id');
    const lugarInspeccionId = dato(req.body, 'lugarInspeccionId', 'lugar_inspeccion_id') ?? null;
    const fechaInspeccion = dato(req.body, 'fechaInspeccion', 'fecha_inspeccion');
    const version = await VersionFormato.findByPk(versionFormatoId);
    if (!version) return fail(res, 'Versión de formato no encontrada', 422);
    if (version.estadoVersion !== 'PUBLICADO') {
      return fail(res, 'Solo se pueden crear inspecciones con una versión PUBLICADA', 409);
    }
    if (lugarInspeccionId && !(await LugarInspeccion.findByPk(lugarInspeccionId))) {
      return fail(res, 'Lugar de inspección no encontrado', 422);
    }
    const inspeccion = await Inspeccion.create({
      versionFormatoId,
      lugarInspeccionId,
      fechaInspeccion,
      observaciones: req.body.observaciones ?? null,
      estado: 'BORRADOR',
      iniciadaPor: req.usuario.id,
      fechaInicio: new Date(),
    });
    return created(res, await Inspeccion.findByPk(inspeccion.id, { include: includeBasico }));
  } catch (error) {
    return next(error);
  }
};

exports.listar = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.estado) where.estado = req.query.estado;
    if (req.query.fecha_desde || req.query.fecha_hasta) {
      where.fechaInspeccion = {};
      if (req.query.fecha_desde) where.fechaInspeccion[Op.gte] = req.query.fecha_desde;
      if (req.query.fecha_hasta) where.fechaInspeccion[Op.lte] = req.query.fecha_hasta;
    }
    const inspecciones = await Inspeccion.findAll({ where, include: includeBasico, order: [['fechaInicio', 'DESC']] });
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
    const hoy = new Date().toISOString().slice(0, 10);
    const inspecciones = await Inspeccion.findAll({
      where: { fechaInspeccion: { [Op.lt]: hoy }, estado: { [Op.ne]: 'CERRADA' } },
      include: includeBasico,
      order: [['fechaInspeccion', 'ASC']],
    });
    return ok(res, inspecciones.map((registro) => ({ ...registro.toJSON(), vencida: true })));
  } catch (error) {
    return next(error);
  }
};

exports.obtener = async (req, res, next) => {
  try {
    const inspeccion = await Inspeccion.findByPk(req.params.id, { include: includeBasico });
    if (!inspeccion) return fail(res, 'Inspección no encontrada', 404);
    return ok(res, inspeccion);
  } catch (error) {
    return next(error);
  }
};

exports.obtenerCompleta = async (req, res, next) => {
  try {
    const inspeccion = await obtenerCompleta(req.params.id);
    if (!inspeccion) return fail(res, 'Inspección no encontrada', 404);
    return ok(res, inspeccion);
  } catch (error) {
    return next(error);
  }
};

exports.actualizar = async (req, res, next) => {
  try {
    const inspeccion = await Inspeccion.findByPk(req.params.id);
    if (!inspeccion) return fail(res, 'Inspección no encontrada', 404);
    if (inspeccion.estado !== 'BORRADOR') {
      return fail(res, 'Solo se puede editar una inspección en BORRADOR', 409);
    }
    const lugarInspeccionId = dato(req.body, 'lugarInspeccionId', 'lugar_inspeccion_id');
    if (lugarInspeccionId && !(await LugarInspeccion.findByPk(lugarInspeccionId))) {
      return fail(res, 'Lugar de inspección no encontrado', 422);
    }
    await inspeccion.update({
      ...(lugarInspeccionId !== undefined ? { lugarInspeccionId } : {}),
      ...(dato(req.body, 'fechaInspeccion', 'fecha_inspeccion')
        ? { fechaInspeccion: dato(req.body, 'fechaInspeccion', 'fecha_inspeccion') }
        : {}),
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
    if (inspeccion.estado !== 'BORRADOR') throw new ApiError('La inspección ya fue completada', 409);
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
        estado: desviaciones ? 'PENDIENTE_ACCION' : 'COMPLETADA',
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
    if (inspeccion.estado === 'BORRADOR') throw new ApiError('Primero debes completar la inspección', 409);
    if (inspeccion.estado === 'CERRADA') throw new ApiError('La inspección ya está cerrada', 409);
    const bloqueos = await bloqueosCierre(inspeccion, transaction);
    if (bloqueos.pendientes.length || bloqueos.desviacionesAbiertas || bloqueos.accionesAbiertas) {
      throw new ApiError('La inspección no cumple las condiciones de cierre', 409, bloqueos);
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
