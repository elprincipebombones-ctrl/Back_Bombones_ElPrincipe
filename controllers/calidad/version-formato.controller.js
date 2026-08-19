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
} = require('../../models');
const crearCrud = require('./crearCrud');
const { ok, fail } = require('../../utils/response');

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
    version.estadoVersion === 'PUBLICADO'
      ? 'Una versión publicada no puede modificarse; crea una nueva versión'
      : null,
});

Object.assign(exports, crud);

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
        { model: FormatoCalidad, as: 'formato', include: [{ model: TipoInspeccion, as: 'tipoInspeccion' }] },
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
