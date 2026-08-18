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
    esObligatorio: body.esObligatorio ?? parametro.esObligatorioDefault,
    permiteObservacion: body.permiteObservacion ?? parametro.permiteObservacionDefault,
    requiereEvidencia: body.requiereEvidencia ?? parametro.requiereEvidenciaDefault,
    bloquearAlGuardar: body.bloquearAlGuardar ?? parametro.bloquearAlGuardarDefault,
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
  ],
  relaciones: [
    { campo: 'seccionFormatoId', modelo: SeccionFormato, mensaje: 'Sección no encontrada' },
    { campo: 'parametroCalidadId', modelo: ParametroCalidad, mensaje: 'Parámetro no encontrado' },
    { campo: 'tipoCampoId', modelo: TipoCampo, mensaje: 'Tipo de campo no encontrado' },
    { campo: 'unidadMedidaId', modelo: UnidadMedida, mensaje: 'Unidad de medida no encontrada' },
  ],
  antesDeCrear: async (body) => (await validarSeccion(body.seccionFormatoId)) || heredarParametro(body),
  antesDeActualizar: async (campo, body) => {
    const errorDestino = await validarSeccion(body.seccionFormatoId);
    if (errorDestino) return errorDestino;
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
