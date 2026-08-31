const {
  VersionFormato,
  FormatoCalidad,
  TipoInspeccion,
  Usuario,
  SeccionFormato,
  CampoFormato,
  ParametroCalidad,
  TipoCampo,
  UnidadMedida,
  OpcionCampo,
  ReglaCalidad,
  NivelSeveridad,
  CondicionRegla,
  AccionRegla,
  TipoAccion,
  ChecklistSeccion,
  CriterioInspeccion,
  AccionCriterio,
  ElementoChecklist,
  ElementoInspeccion,
  CategoriaElemento,
  ProgramaCalidad,
} = require('../../models');
const crearCrud = require('./crearCrud');
const { ok, fail } = require('../../utils/response');
const { sequelize } = require('../../models');
const { created } = require('../../utils/response');
const { ApiError } = require('../../utils/ApiError');
const {
  crearVersion,
  publicarVersion,
} = require('../../services/calidad/versiones-formato.service');

const crud = crearCrud({
  modelo: VersionFormato,
  nombre: 'Versión de formato',
  bajaLogica: false,
  include: [
    { model: FormatoCalidad, as: 'formato' },
    { model: Usuario, as: 'publicador', attributes: ['id', 'nombre', 'correo'] },
  ],
  relaciones: [
    { campo: 'formatoCalidadId', modelo: FormatoCalidad, mensaje: 'Formato no encontrado' },
    { campo: 'publicadoPor', modelo: Usuario, mensaje: 'Usuario publicador no encontrado' },
  ],
  antesDeActualizar: (version) =>
    version.estadoVersion !== 'BORRADOR'
      ? 'Una versión publicada u obsoleta no puede modificarse; crea una nueva versión'
      : null,
  antesDeEliminar: (version) =>
    version.estadoVersion !== 'BORRADOR'
      ? 'Una versión publicada u obsoleta no puede eliminarse'
      : null,
});

Object.assign(exports, crud);

exports.crear = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const formato = await FormatoCalidad.findByPk(req.body.formatoCalidadId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!formato) throw new ApiError('Formato no encontrado', 422);
    const version = await crearVersion({
      formatoCalidadId: formato.id,
      datos: req.body,
      transaction,
    });
    await transaction.commit();
    return created(res, version, 'Versión borrador creada');
  } catch (error) {
    await transaction.rollback();
    return next(error);
  }
};

exports.actualizar = async (req, res, next) => {
  try {
    const version = await VersionFormato.findByPk(req.params.id);
    if (!version) return fail(res, 'Versión de formato no encontrada', 404);
    if (version.estadoVersion !== 'BORRADOR') {
      return fail(res, 'Una versión publicada u obsoleta es de solo lectura', 409);
    }
    if (req.body.estadoVersion && req.body.estadoVersion !== 'BORRADOR') {
      return fail(res, 'Usa la operación Publicar para cambiar el estado de la versión', 409);
    }
    await version.update({
      ...(req.body.fechaVigenciaDesde !== undefined
        ? { fechaVigenciaDesde: req.body.fechaVigenciaDesde }
        : {}),
      ...(req.body.fechaVigenciaHasta !== undefined
        ? { fechaVigenciaHasta: req.body.fechaVigenciaHasta || null }
        : {}),
      ...(req.body.observaciones !== undefined ? { observaciones: req.body.observaciones } : {}),
    });
    return ok(res, version, 'Versión de formato actualizada');
  } catch (error) {
    return next(error);
  }
};

exports.publicar = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const version = await publicarVersion({
      versionId: req.params.id,
      usuarioId: req.usuario.id,
      transaction,
    });
    await transaction.commit();
    return ok(res, version, 'Versión publicada; la anterior quedó obsoleta');
  } catch (error) {
    await transaction.rollback();
    return next(error);
  }
};

exports.listarPorFormato = async (req, res, next) => {
  try {
    return ok(
      res,
      await VersionFormato.findAll({
        where: { formatoCalidadId: req.params.formatoId },
        order: [['numeroVersion', 'DESC']],
      }),
    );
  } catch (error) {
    return next(error);
  }
};

exports.obtenerCompleta = async (req, res, next) => {
  try {
    const version = await VersionFormato.findByPk(req.params.id, {
      include: [
        {
          model: FormatoCalidad,
          as: 'formato',
          include: [
            { model: TipoInspeccion, as: 'tipoInspeccion' },
            { model: ProgramaCalidad, as: 'programa' },
          ],
        },
        { model: Usuario, as: 'publicador', attributes: ['id', 'nombre', 'correo'] },
        {
          model: SeccionFormato,
          as: 'secciones',
          include: [
            {
              model: CampoFormato,
              as: 'campos',
              include: [
                {
                  model: ParametroCalidad,
                  as: 'parametro',
                  include: [
                    { model: TipoCampo, as: 'tipoCampo' },
                    { model: UnidadMedida, as: 'unidadMedida' },
                    {
                      model: ReglaCalidad,
                      as: 'reglas',
                      include: [
                        { model: NivelSeveridad, as: 'nivelSeveridad' },
                        { model: CondicionRegla, as: 'condiciones' },
                        { model: AccionRegla, as: 'acciones', include: [{ model: TipoAccion, as: 'tipoAccion' }] },
                      ],
                    },
                  ],
                },
                { model: TipoCampo, as: 'tipoCampo' },
                { model: UnidadMedida, as: 'unidadMedida' },
                { model: OpcionCampo, as: 'opciones' },
                {
                  model: ReglaCalidad,
                  as: 'reglas',
                  include: [
                    { model: NivelSeveridad, as: 'nivelSeveridad' },
                    { model: CondicionRegla, as: 'condiciones' },
                    { model: AccionRegla, as: 'acciones', include: [{ model: TipoAccion, as: 'tipoAccion' }] },
                  ],
                },
              ],
            },
            {
              model: ChecklistSeccion,
              as: 'checklists',
              include: [
                {
                  model: CriterioInspeccion,
                  as: 'criterio',
                  include: [
                    { model: TipoCampo, as: 'tipoCampo' },
                    { model: NivelSeveridad, as: 'nivelSeveridad' },
                    {
                      model: AccionCriterio,
                      as: 'acciones',
                      include: [{ model: TipoAccion, as: 'tipoAccion' }],
                    },
                  ],
                },
                {
                  model: ElementoChecklist,
                  as: 'elementos',
                  include: [{
                    model: ElementoInspeccion,
                    as: 'elemento',
                    include: [{ model: CategoriaElemento, as: 'categoria' }],
                  }],
                },
              ],
            },
          ],
        },
      ],
      order: [
        [{ model: SeccionFormato, as: 'secciones' }, 'orden', 'ASC'],
        [{ model: SeccionFormato, as: 'secciones' }, { model: CampoFormato, as: 'campos' }, 'orden', 'ASC'],
        [{ model: SeccionFormato, as: 'secciones' }, { model: ChecklistSeccion, as: 'checklists' }, 'orden', 'ASC'],
        [
          { model: SeccionFormato, as: 'secciones' },
          { model: ChecklistSeccion, as: 'checklists' },
          { model: ElementoChecklist, as: 'elementos' },
          'orden',
          'ASC',
        ],
      ],
    });
    if (!version) return fail(res, 'Versión de formato no encontrada', 404);
    return ok(res, version);
  } catch (error) {
    return next(error);
  }
};
