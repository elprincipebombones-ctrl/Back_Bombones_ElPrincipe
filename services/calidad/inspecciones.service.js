const { Op } = require('sequelize');
const {
  Inspeccion,
  VersionFormato,
  FormatoCalidad,
  LugarInspeccion,
  CategoriaLugarInspeccion,
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
  CondicionRegla,
  AccionRegla,
  NivelSeveridad,
  AccionCorrectiva,
  TipoAccion,
  SeguimientoAccionCorrectiva,
  EvidenciaAccionCorrectiva,
  ChecklistSeccion,
  ElementoChecklist,
  CriterioInspeccion,
  AccionCriterio,
  RespuestaElementoChecklist,
} = require('../../models');

const usuarioPublico = ['id', 'nombre', 'correo'];

const obtenerCompleta = async (id, transaction) => {
  const inspeccion = await Inspeccion.findByPk(id, {
    include: [
      {
        model: LugarInspeccion,
        as: 'lugarInspeccion',
        include: [{ model: CategoriaLugarInspeccion, as: 'categoria' }],
      },
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
                  {
                    model: ParametroCalidad,
                    as: 'parametro',
                    include: [
                      { model: TipoCampo, as: 'tipoCampo' },
                      { model: UnidadMedida, as: 'unidadMedida' },
                      {
                        model: ReglaCalidad,
                        as: 'reglas',
                        where: { estado: true },
                        required: false,
                        include: [
                          {
                            model: CondicionRegla,
                            as: 'condiciones',
                            where: { estado: true },
                            required: false,
                          },
                          {
                            model: AccionRegla,
                            as: 'acciones',
                            where: { estado: true },
                            required: false,
                            include: [{ model: TipoAccion, as: 'tipoAccion' }],
                          },
                        ],
                      },
                    ],
                  },
                  { model: TipoCampo, as: 'tipoCampo' },
                  { model: UnidadMedida, as: 'unidadMedida' },
                  { model: OpcionCampo, as: 'opciones' },
                ],
              },
              {
                model: ChecklistSeccion,
                as: 'checklists',
                where: { estado: true },
                required: false,
                include: [
                  {
                    model: CriterioInspeccion,
                    as: 'criterio',
                    include: [
                      {
                        model: AccionCriterio,
                        as: 'acciones',
                        where: { estado: true },
                        required: false,
                        include: [{ model: TipoAccion, as: 'tipoAccion', where: { estado: true } }],
                      },
                    ],
                  },
                  {
                    model: ElementoChecklist,
                    as: 'elementos',
                    where: { estado: true },
                    required: false,
                  },
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
        model: RespuestaElementoChecklist,
        as: 'respuestasChecklist',
        include: [
          { model: ElementoChecklist, as: 'seleccion' },
          { model: CriterioInspeccion, as: 'criterio' },
        ],
      },
      {
        model: Desviacion,
        as: 'desviaciones',
        include: [
          {
            model: ReglaCalidad,
            as: 'regla',
            include: [
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
            model: RespuestaElementoChecklist,
            as: 'respuestaChecklist',
            include: [
              {
                model: CriterioInspeccion,
                as: 'criterio',
                include: [
                  {
                    model: AccionCriterio,
                    as: 'acciones',
                    where: { estado: true },
                    required: false,
                    include: [{ model: TipoAccion, as: 'tipoAccion' }],
                  },
                ],
              },
            ],
          },
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
      [
        { model: VersionFormato, as: 'version' },
        { model: SeccionFormato, as: 'secciones' },
        'orden',
        'ASC',
      ],
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
  for (const seccion of data.version?.secciones || []) {
    for (const checklist of seccion.checklists || []) {
      const acciones = checklist.criterio?.acciones || [];
      if (checklist.criterio) {
        checklist.criterio.requiereObservacionIncumplimiento = acciones.some(
          (accion) => accion.estado && accion.tipoAccion?.codigo === 'EXIGIR_OBSERVACION',
        );
      }
    }
    for (const campo of seccion.campos || []) {
      for (const regla of campo.parametro?.reglas || []) {
        regla.requiereObservacionIncumplimiento = (regla.acciones || []).some(
          (accion) => accion.estado && accion.tipoAccion?.codigo === 'EXIGIR_OBSERVACION',
        );
      }
    }
  }
  data.vencida =
    data.estado !== 'CERRADA' && data.fechaInspeccion < new Date().toISOString().slice(0, 10);
  return data;
};

const camposObligatoriosPendientes = async (inspeccion, transaction) => {
  const campos = await CampoFormato.findAll({
    attributes: ['id', 'codigo', 'etiqueta', 'esObligatorio'],
    where: { estado: true },
    include: [
      { model: ParametroCalidad, as: 'parametro', required: false },
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
  const camposObligatorios = campos.filter((campo) =>
    campo.parametro ? campo.parametro.esObligatorioDefault : campo.esObligatorio,
  );
  const respuestas = await RespuestaInspeccion.findAll({
    attributes: ['campoFormatoId'],
    where: {
      inspeccionId: inspeccion.id,
      campoFormatoId: { [Op.in]: camposObligatorios.map((campo) => campo.id) },
    },
    transaction,
  });
  const respondidos = new Set(respuestas.map((respuesta) => respuesta.campoFormatoId));
  const pendientes = camposObligatorios
    .filter((campo) => !respondidos.has(campo.id))
    .map((campo) => ({
      tipo: 'CAMPO',
      id: campo.id,
      codigo: campo.codigo,
      nombre: campo.etiqueta,
    }));

  const elementos = await ElementoChecklist.findAll({
    attributes: ['id', 'codigoSnapshot', 'nombreSnapshot'],
    where: { estado: true },
    include: [
      {
        model: ChecklistSeccion,
        as: 'checklist',
        attributes: [],
        required: true,
        where: { estado: true },
        include: [
          {
            model: SeccionFormato,
            as: 'seccion',
            attributes: [],
            required: true,
            where: { versionFormatoId: inspeccion.versionFormatoId, estado: true },
          },
        ],
      },
    ],
    transaction,
  });
  const respuestasChecklist = await RespuestaElementoChecklist.findAll({
    attributes: ['elementoChecklistId'],
    where: {
      inspeccionId: inspeccion.id,
      elementoChecklistId: { [Op.in]: elementos.map((elemento) => elemento.id) },
    },
    transaction,
  });
  const checklistRespondidos = new Set(
    respuestasChecklist.map((respuesta) => respuesta.elementoChecklistId),
  );
  pendientes.push(
    ...elementos
      .filter((elemento) => !checklistRespondidos.has(elemento.id))
      .map((elemento) => ({
        tipo: 'CHECKLIST',
        id: elemento.id,
        codigo: elemento.codigoSnapshot,
        nombre: elemento.nombreSnapshot,
      })),
  );
  return pendientes;
};

const bloqueosCierre = async (inspeccion, transaction) => {
  const pendientes = await camposObligatoriosPendientes(inspeccion, transaction);
  const desviacionesAbiertas = await Desviacion.count({
    where: { inspeccionId: inspeccion.id, estado: { [Op.ne]: 'CERRADA' } },
    transaction,
  });
  const accionesAbiertas = await AccionCorrectiva.count({
    where: { estado: { [Op.ne]: 'CERRADA' } },
    include: [
      {
        model: Desviacion,
        as: 'desviacion',
        where: { inspeccionId: inspeccion.id },
        attributes: [],
      },
      {
        model: TipoAccion,
        as: 'tipoAccion',
        where: { codigo: 'SOLICITAR_ACCION_CORRECTIVA' },
        attributes: [],
      },
    ],
    transaction,
  });
  return { pendientes, desviacionesAbiertas, accionesAbiertas };
};

module.exports = { obtenerCompleta, camposObligatoriosPendientes, bloqueosCierre };
