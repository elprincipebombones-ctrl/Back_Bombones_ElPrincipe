const {
  ReglaCalidad,
  CampoFormato,
  ParametroCalidad,
  NivelSeveridad,
  CondicionRegla,
  AccionRegla,
  TipoAccion,
} = require('../../models');
const crearCrud = require('../calidad/crearCrud');
const { validarCampo } = require('../../services/calidad/inmutabilidad-version.service');

module.exports = crearCrud({
  modelo: ReglaCalidad,
  nombre: 'Regla de calidad',
  include: [
    { model: CampoFormato, as: 'campo' },
    { model: ParametroCalidad, as: 'parametro' },
    { model: NivelSeveridad, as: 'nivelSeveridad' },
    { model: CondicionRegla, as: 'condiciones' },
    { model: AccionRegla, as: 'acciones', include: [{ model: TipoAccion, as: 'tipoAccion' }] },
  ],
  relaciones: [
    { campo: 'campoFormatoId', modelo: CampoFormato, mensaje: 'Campo de formato no encontrado' },
    { campo: 'parametroCalidadId', modelo: ParametroCalidad, mensaje: 'Parámetro no encontrado' },
    {
      campo: 'nivelSeveridadId',
      modelo: NivelSeveridad,
      mensaje: 'Nivel de severidad no encontrado',
    },
  ],
  antesDeCrear: (body) => (body.parametroCalidadId ? null : validarCampo(body.campoFormatoId)),
  antesDeActualizar: async (regla, body) => {
    if (body.parametroCalidadId || regla.parametroCalidadId) return null;
    return (await validarCampo(regla.campoFormatoId)) || validarCampo(body.campoFormatoId);
  },
  antesDeEliminar: (regla) => (regla.parametroCalidadId ? null : validarCampo(regla.campoFormatoId)),
});
