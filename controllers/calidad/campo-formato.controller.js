const {
  CampoFormato,
  SeccionFormato,
  VersionFormato,
  ParametroCalidad,
  TipoCampo,
  UnidadMedida,
} = require('../../models');
const crearCrud = require('./crearCrud');
const { validarSeccion } = require('../../services/calidad/inmutabilidad-version.service');

const configurarCalculado = async (body, campoActual = null) => {
  const calculado = body.esCalculado ?? campoActual?.esCalculado ?? false;
  if (!calculado) {
    if (body.esCalculado === false) {
      body.campoNumeradorId = null;
      body.campoDenominadorId = null;
      body.multiplicador = 100;
    }
    return null;
  }
  const seccionId = body.seccionFormatoId ?? campoActual?.seccionFormatoId;
  const parametroId = body.parametroCalidadId ?? campoActual?.parametroCalidadId;
  const numeradorId = body.campoNumeradorId ?? campoActual?.campoNumeradorId;
  const denominadorId = body.campoDenominadorId ?? campoActual?.campoDenominadorId;
  if (!parametroId) return 'Selecciona el parámetro numérico que representa el cálculo';
  if (!numeradorId || !denominadorId) return 'Selecciona numerador y denominador';
  if (numeradorId === denominadorId) return 'Numerador y denominador deben ser diferentes';

  const seccion = await SeccionFormato.findByPk(seccionId);
  const fuentes = await CampoFormato.findAll({
    where: { id: [numeradorId, denominadorId], estado: true },
    include: [
      { model: TipoCampo, as: 'tipoCampo', required: true, where: { codigo: 'NUMERO' } },
      { model: SeccionFormato, as: 'seccion', required: true },
    ],
  });
  if (!seccion || fuentes.length !== 2) {
    return 'Los campos base deben ser numéricos, activos y pertenecer a esta versión';
  }
  if (fuentes.some((fuente) => fuente.seccion.versionFormatoId !== seccion.versionFormatoId)) {
    return 'Numerador y denominador deben pertenecer a la misma versión del formato';
  }
  const tipoNumero = await TipoCampo.findOne({ where: { codigo: 'NUMERO', estado: true } });
  if (!tipoNumero) return 'No existe un tipo de campo NUMERO activo';
  const parametro = await ParametroCalidad.findOne({
    where: { id: parametroId, estado: true, tipoCampoId: tipoNumero.id },
  });
  if (!parametro) return 'El parámetro calculado debe ser un parámetro numérico activo';
  Object.assign(body, {
    esCalculado: true,
    parametroCalidadId: parametro.id,
    tipoCampoId: tipoNumero.id,
    unidadMedidaId: null,
    campoNumeradorId: numeradorId,
    campoDenominadorId: denominadorId,
    multiplicador: body.multiplicador ?? campoActual?.multiplicador ?? 100,
    esObligatorio: false,
    bloquearAlGuardar: false,
  });
  return null;
};

const heredarParametro = async (body) => {
  if (!body.parametroCalidadId) return null;
  const parametro = await ParametroCalidad.findByPk(body.parametroCalidadId);
  if (!parametro) return 'Parámetro no encontrado';
  Object.assign(body, {
    tipoCampoId: parametro.tipoCampoId,
    unidadMedidaId: parametro.unidadMedidaId,
    valorMinimo: parametro.valorMinimo,
    valorMaximo: parametro.valorMaximo,
    precisionDecimal: parametro.precisionDecimal,
    codigo: body.codigo || parametro.codigo,
    etiqueta: body.etiqueta || parametro.nombre,
    // Estas columnas se conservan como snapshot para versiones históricas. En la
    // ejecución, la fuente vigente es el parámetro y sus escenarios.
    esObligatorio: parametro.esObligatorioDefault,
    permiteObservacion: parametro.permiteObservacionDefault,
    requiereEvidencia: parametro.requiereEvidenciaDefault,
    bloquearAlGuardar: parametro.bloquearAlGuardarDefault,
  });
  return null;
};

module.exports = crearCrud({
  modelo: CampoFormato,
  nombre: 'Campo de formato',
  order: [['orden', 'ASC']],
  include: [
    { model: ParametroCalidad, as: 'parametro' },
    { model: TipoCampo, as: 'tipoCampo' },
    { model: UnidadMedida, as: 'unidadMedida' },
    { model: CampoFormato, as: 'campoNumerador' },
    { model: CampoFormato, as: 'campoDenominador' },
  ],
  relaciones: [
    { campo: 'seccionFormatoId', modelo: SeccionFormato, mensaje: 'Sección no encontrada' },
    { campo: 'parametroCalidadId', modelo: ParametroCalidad, mensaje: 'Parámetro no encontrado' },
    { campo: 'tipoCampoId', modelo: TipoCampo, mensaje: 'Tipo de campo no encontrado' },
    { campo: 'unidadMedidaId', modelo: UnidadMedida, mensaje: 'Unidad de medida no encontrada' },
  ],
  antesDeCrear: async (body) =>
    (await validarSeccion(body.seccionFormatoId)) ||
    (await configurarCalculado(body)) ||
    heredarParametro(body),
  antesDeActualizar: async (campo, body) => {
    const errorDestino = await validarSeccion(body.seccionFormatoId);
    if (errorDestino) return errorDestino;
    const errorCalculo = await configurarCalculado(body, campo);
    if (errorCalculo) return errorCalculo;
    const errorParametro = await heredarParametro(body);
    if (errorParametro) return errorParametro;
    const seccion = await SeccionFormato.findByPk(campo.seccionFormatoId, {
      include: [{ model: VersionFormato, as: 'version' }],
    });
    return seccion?.version?.estadoVersion === 'PUBLICADO'
      ? 'No se puede modificar un campo de una versión publicada'
      : null;
  },
  antesDeEliminar: (campo) => validarSeccion(campo.seccionFormatoId),
});
