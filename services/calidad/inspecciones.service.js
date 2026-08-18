const { Op } = require('sequelize');
const {
  Inspeccion,
  VersionFormato,
  FormatoCalidad,
  LugarInspeccion,
  Usuario,
  SeccionFormato,
  CampoFormato,
  ParametroCalidad,
  TipoCampo,
  UnidadMedida,
  OpcionCampo,
  RespuestaInspeccion,
  RespuestaOpcion,
  Desviacion,
  ReglaCalidad,
  NivelSeveridad,
  AccionCorrectiva,
  TipoAccion,
  SeguimientoAccionCorrectiva,
  EvidenciaAccionCorrectiva,
} = require('../../models');

const usuarioPublico = ['id', 'nombre', 'correo'];

const obtenerCompleta = async (id, transaction) => {
  const inspeccion = await Inspeccion.findByPk(id, {
    include: [
      { model: LugarInspeccion, as: 'lugarInspeccion' },
      { model: Usuario, as: 'iniciador', attributes: usuarioPublico },
      { model: Usuario, as: 'cerrador', attributes: usuarioPublico },
      {
        model: VersionFormato,
        as: 'version',
        include: [
          { model: FormatoCalidad, as: 'formato' },
          {
            model: SeccionFormato,
            as: 'secciones',
            include: [
              {
                model: CampoFormato,
                as: 'campos',
                include: [
                  { model: ParametroCalidad, as: 'parametro' },
                  { model: TipoCampo, as: 'tipoCampo' },
                  { model: UnidadMedida, as: 'unidadMedida' },
                  { model: OpcionCampo, as: 'opciones' },
                ],
              },
            ],
          },
        ],
      },
      {
        model: RespuestaInspeccion,
        as: 'respuestas',
        include: [
          { model: CampoFormato, as: 'campo' },
          {
            model: RespuestaOpcion,
            as: 'opcionesSeleccionadas',
            include: [{ model: OpcionCampo, as: 'opcion' }],
          },
        ],
      },
      {
        model: Desviacion,
        as: 'desviaciones',
        include: [
          { model: ReglaCalidad, as: 'regla' },
          { model: NivelSeveridad, as: 'nivelSeveridad' },
          {
            model: AccionCorrectiva,
            as: 'accionesCorrectivas',
            include: [
              { model: TipoAccion, as: 'tipoAccion' },
              { model: SeguimientoAccionCorrectiva, as: 'seguimientos' },
              { model: EvidenciaAccionCorrectiva, as: 'evidencias' },
            ],
          },
        ],
      },
    ],
    order: [
      [{ model: VersionFormato, as: 'version' }, { model: SeccionFormato, as: 'secciones' }, 'orden', 'ASC'],
      [
        { model: VersionFormato, as: 'version' },
        { model: SeccionFormato, as: 'secciones' },
        { model: CampoFormato, as: 'campos' },
        'orden',
        'ASC',
      ],
    ],
    transaction,
  });
  if (!inspeccion) return null;
  const data = inspeccion.toJSON();
  data.vencida = data.estado !== 'CERRADA' && data.fechaInspeccion < new Date().toISOString().slice(0, 10);
  return data;
};

const camposObligatoriosPendientes = async (inspeccion, transaction) => {
  const campos = await CampoFormato.findAll({
    attributes: ['id', 'codigo', 'etiqueta'],
    where: { esObligatorio: true, estado: true },
    include: [
      {
        model: SeccionFormato,
        as: 'seccion',
        attributes: [],
        required: true,
        where: { versionFormatoId: inspeccion.versionFormatoId, estado: true },
      },
    ],
    transaction,
  });
  const respuestas = await RespuestaInspeccion.findAll({
    attributes: ['campoFormatoId'],
    where: { inspeccionId: inspeccion.id, campoFormatoId: { [Op.in]: campos.map((campo) => campo.id) } },
    transaction,
  });
  const respondidos = new Set(respuestas.map((respuesta) => respuesta.campoFormatoId));
  return campos.filter((campo) => !respondidos.has(campo.id));
};

const bloqueosCierre = async (inspeccion, transaction) => {
  const pendientes = await camposObligatoriosPendientes(inspeccion, transaction);
  const desviacionesAbiertas = await Desviacion.count({
    where: { inspeccionId: inspeccion.id, estado: { [Op.ne]: 'CERRADA' } },
    transaction,
  });
  const accionesAbiertas = await AccionCorrectiva.count({
    where: { estado: { [Op.ne]: 'CERRADA' } },
    include: [{ model: Desviacion, as: 'desviacion', where: { inspeccionId: inspeccion.id }, attributes: [] }],
    transaction,
  });
  return { pendientes, desviacionesAbiertas, accionesAbiertas };
};

module.exports = { obtenerCompleta, camposObligatoriosPendientes, bloqueosCierre };
