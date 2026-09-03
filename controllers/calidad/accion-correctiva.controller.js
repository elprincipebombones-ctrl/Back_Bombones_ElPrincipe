const { Op } = require('sequelize');
const {
  AccionCorrectiva,
  sequelize,
  Desviacion,
  TipoAccion,
  Usuario,
  SeguimientoAccionCorrectiva,
  EvidenciaAccionCorrectiva,
  Inspeccion,
  VersionFormato,
  FormatoCalidad,
  LugarInspeccion,
  CategoriaLugarInspeccion,
  ReglaCalidad,
  CondicionRegla,
  AccionRegla,
  RespuestaInspeccion,
  CampoFormato,
  ParametroCalidad,
  UnidadMedida,
  RespuestaElementoChecklist,
  ElementoChecklist,
  CriterioInspeccion,
  AprobadorAccionCorrectiva,
  CampoAccionInstancia,
} = require('../../models');
const { ok, fail } = require('../../utils/response');
const { ApiError } = require('../../utils/ApiError');
const {
  validarRequisitosCierre,
  requisitosDeDesviacion,
} = require('../../services/calidad/acciones-correctivas.service');
const { camposObligatoriosPendientes } = require('../../services/calidad/inspecciones.service');

const include = [
  { model: TipoAccion, as: 'tipoAccion' },
  { model: Usuario, as: 'responsable', attributes: ['id', 'nombre', 'correo'] },
  { model: Usuario, as: 'remitenteAprobacion', attributes: ['id', 'nombre', 'correo'] },
  { model: Usuario, as: 'cerrador', attributes: ['id', 'nombre', 'correo'] },
  { model: SeguimientoAccionCorrectiva, as: 'seguimientos' },
  { model: EvidenciaAccionCorrectiva, as: 'evidencias' },
  { model: CampoAccionInstancia, as: 'camposAdicionales' },
  {
    model: Desviacion,
    as: 'desviacion',
    include: [
      {
        model: Inspeccion,
        as: 'inspeccion',
        include: [
          {
            model: VersionFormato,
            as: 'version',
            include: [{ model: FormatoCalidad, as: 'formato' }],
          },
          {
            model: LugarInspeccion,
            as: 'lugarInspeccion',
            include: [{ model: CategoriaLugarInspeccion, as: 'categoria' }],
          },
          { model: Usuario, as: 'iniciador', attributes: ['id', 'nombre', 'correo'] },
        ],
      },
      {
        model: ReglaCalidad,
        as: 'regla',
        include: [
          { model: CondicionRegla, as: 'condiciones', where: { estado: true }, required: false },
          {
            model: AccionRegla,
            as: 'acciones',
            where: { estado: true },
            required: false,
            include: [{ model: TipoAccion, as: 'tipoAccion' }],
          },
        ],
      },
      {
        model: RespuestaInspeccion,
        as: 'respuesta',
        include: [
          {
            model: CampoFormato,
            as: 'campo',
            include: [
              { model: ParametroCalidad, as: 'parametro' },
              { model: UnidadMedida, as: 'unidadMedida' },
            ],
          },
        ],
      },
      {
        model: RespuestaElementoChecklist,
        as: 'respuestaChecklist',
        include: [
          { model: ElementoChecklist, as: 'seleccion' },
          { model: CriterioInspeccion, as: 'criterio' },
        ],
      },
    ],
  },
];

const conRequisitos = async (accion, puedeCerrar = false) => ({
  ...accion.toJSON(),
  requisitos: await requisitosDeDesviacion(accion.desviacionId),
  puedeCerrar,
});

const usuarioPuedeCerrar = async (req, transaction) => {
  const registro = await AprobadorAccionCorrectiva.findOne({
    where: { usuarioId: req.usuario.id, estado: true },
    transaction,
  });
  return !!registro;
};

exports.listar = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.estado) where.estado = req.query.estado;
    if (req.query.solo_pendientes === 'true') where.estado = { [Op.ne]: 'CERRADA' };
    if (req.query.responsable_id) where.responsableId = req.query.responsable_id;
    let acciones = await AccionCorrectiva.findAll({
      where,
      include,
      order: [['fechaAsignacion', 'DESC']],
    });
    if (req.query.solo_pendientes === 'true') {
      acciones = acciones.filter(
        (accion) => accion.tipoAccion?.codigo === 'SOLICITAR_ACCION_CORRECTIVA',
      );
    }
    const puedeCerrar = await usuarioPuedeCerrar(req);
    return ok(res, await Promise.all(acciones.map((accion) => conRequisitos(accion, puedeCerrar))));
  } catch (error) {
    return next(error);
  }
};

exports.obtener = async (req, res, next) => {
  try {
    const accion = await AccionCorrectiva.findByPk(req.params.id, { include });
    if (!accion) return fail(res, 'Acción correctiva no encontrada', 404);
    return ok(res, await conRequisitos(accion, await usuarioPuedeCerrar(req)));
  } catch (error) {
    return next(error);
  }
};

exports.actualizar = async (req, res, next) => {
  try {
    const accion = await AccionCorrectiva.findByPk(req.params.id);
    if (!accion) return fail(res, 'Acción correctiva no encontrada', 404);
    if (accion.estado === 'CERRADA') return fail(res, 'No se puede editar una acción cerrada', 409);
    const responsableId = req.body.responsableId ?? req.body.responsable_id;
    if (responsableId && !(await Usuario.findByPk(responsableId))) {
      return fail(res, 'Usuario responsable no encontrado', 422);
    }
    await accion.update({
      ...(req.body.descripcion !== undefined ? { descripcion: req.body.descripcion } : {}),
      ...(responsableId !== undefined ? { responsableId } : {}),
      ...((req.body.fechaLimite ?? req.body.fecha_limite) !== undefined
        ? { fechaLimite: req.body.fechaLimite ?? req.body.fecha_limite }
        : {}),
    });
    return ok(res, accion, 'Acción correctiva actualizada');
  } catch (error) {
    return next(error);
  }
};

exports.iniciarAccion = async (req, res, next) => {
  try {
    const accion = await AccionCorrectiva.findByPk(req.params.id, {
      include: [{ model: Desviacion, as: 'desviacion' }],
    });
    if (!accion) return fail(res, 'Acción correctiva no encontrada', 404);
    if (accion.estado !== 'PENDIENTE') return fail(res, 'La acción no está pendiente', 409);
    await accion.update({ estado: 'EN_PROCESO', fechaInicio: new Date() });
    if (accion.desviacion.estado === 'ABIERTA') {
      await accion.desviacion.update({ estado: 'EN_TRATAMIENTO' });
    }
    return ok(res, accion, 'Acción correctiva iniciada');
  } catch (error) {
    return next(error);
  }
};

exports.guardarCamposAdicionales = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const accion = await AccionCorrectiva.findByPk(req.params.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!accion) throw new ApiError('Acción correctiva no encontrada', 404);
    if (!['PENDIENTE', 'EN_PROCESO'].includes(accion.estado)) {
      throw new ApiError(
        'Los campos adicionales quedan en solo lectura después de enviar la acción a aprobación',
        409,
      );
    }

    const instancias = await CampoAccionInstancia.findAll({
      where: { accionCorrectivaId: accion.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const porId = new Map(instancias.map((instancia) => [instancia.id, instancia]));
    for (const entrada of req.body.campos) {
      const instancia = porId.get(entrada.id);
      if (!instancia) {
        throw new ApiError('Uno de los campos no pertenece a esta acción correctiva', 422);
      }
      await instancia.update(
        {
          valorTexto: entrada.valorTexto?.trim() || null,
        },
        { transaction },
      );
    }

    await transaction.commit();
    return ok(
      res,
      await CampoAccionInstancia.findAll({
        where: { accionCorrectivaId: accion.id },
        order: [['orden', 'ASC']],
      }),
      'Campos adicionales guardados',
    );
  } catch (error) {
    await transaction.rollback();
    return next(error);
  }
};

exports.enviarAprobacion = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const accion = await AccionCorrectiva.findByPk(req.params.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!accion) throw new ApiError('Acción correctiva no encontrada', 404);
    if (accion.estado === 'CERRADA') throw new ApiError('La acción ya está cerrada', 409);
    if (accion.estado === 'PENDIENTE_APROBACION') {
      throw new ApiError('La acción ya está pendiente de aprobación', 409);
    }
    await validarRequisitosCierre(accion, transaction);
    await accion.update(
      {
        estado: 'PENDIENTE_APROBACION',
        fechaInicio: accion.fechaInicio ?? new Date(),
        fechaEnvioAprobacion: new Date(),
        enviadaAprobacionPor: req.usuario.id,
      },
      { transaction },
    );
    const desviacion = await Desviacion.findByPk(accion.desviacionId, { transaction });
    if (desviacion?.estado === 'ABIERTA') {
      await desviacion.update({ estado: 'EN_TRATAMIENTO' }, { transaction });
    }
    await transaction.commit();
    return ok(res, accion, 'Acción enviada a aprobación');
  } catch (error) {
    await transaction.rollback();
    return next(error);
  }
};

exports.cerrarAccion = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const accion = await AccionCorrectiva.findByPk(req.params.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!accion) throw new ApiError('Acción correctiva no encontrada', 404);
    if (accion.estado === 'CERRADA') throw new ApiError('La acción ya está cerrada', 409);
    if (accion.estado !== 'PENDIENTE_APROBACION') {
      throw new ApiError('La acción debe estar pendiente de aprobación antes de cerrarse', 409);
    }
    if (!(await usuarioPuedeCerrar(req, transaction))) {
      throw new ApiError('No estás autorizado para aprobar y cerrar acciones correctivas', 403);
    }

    await validarRequisitosCierre(accion, transaction);
    await accion.update(
      {
        estado: 'CERRADA',
        fechaCierre: new Date(),
        cerradaPor: req.usuario.id,
        observacionCierre: req.body.observacion_cierre ?? req.body.observacionCierre ?? null,
      },
      { transaction },
    );

    const desviacion = await Desviacion.findByPk(accion.desviacionId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const accionesAbiertas = await AccionCorrectiva.count({
      where: { desviacionId: desviacion.id, estado: { [Op.ne]: 'CERRADA' } },
      include: [
        {
          model: TipoAccion,
          as: 'tipoAccion',
          where: { codigo: 'SOLICITAR_ACCION_CORRECTIVA' },
          attributes: [],
        },
      ],
      transaction,
    });
    if (!accionesAbiertas) {
      await desviacion.update(
        {
          estado: 'CERRADA',
          fechaCierre: new Date(),
          cerradaPor: req.usuario.id,
        },
        { transaction },
      );
      const desviacionesAbiertas = await Desviacion.count({
        where: { inspeccionId: desviacion.inspeccionId, estado: { [Op.ne]: 'CERRADA' } },
        transaction,
      });
      if (!desviacionesAbiertas) {
        const inspeccion = await Inspeccion.findByPk(desviacion.inspeccionId, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (inspeccion && !(await camposObligatoriosPendientes(inspeccion, transaction)).length) {
          await inspeccion.update(
            {
              estado: 'CERRADA',
              cerradaPor: req.usuario.id,
              fechaCierre: new Date(),
            },
            { transaction },
          );
        }
      }
    }
    await transaction.commit();
    return ok(res, accion, 'Acción correctiva cerrada');
  } catch (error) {
    await transaction.rollback();
    return next(error);
  }
};

exports.resumenAbiertas = async (inspeccionId) =>
  AccionCorrectiva.count({
    where: { estado: { [Op.ne]: 'CERRADA' } },
    include: [
      { model: Desviacion, as: 'desviacion', where: { inspeccionId }, attributes: [] },
      {
        model: TipoAccion,
        as: 'tipoAccion',
        where: { codigo: 'SOLICITAR_ACCION_CORRECTIVA' },
        attributes: [],
      },
    ],
  });
