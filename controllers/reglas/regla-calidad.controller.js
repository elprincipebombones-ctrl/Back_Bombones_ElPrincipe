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
  antesDeCrear: async (body) => {
    const error = body.parametroCalidadId ? null : await validarCampo(body.campoFormatoId);
    if (error) return error;
    // Una regla nueva solo se activa después de guardar su condición.
    body.estado = false;
    return null;
  },
  antesDeActualizar: async (regla, body) => {
    if (!body.parametroCalidadId && !regla.parametroCalidadId) {
      const error = (await validarCampo(regla.campoFormatoId)) ||
        (await validarCampo(body.campoFormatoId));
      if (error) return error;
    }
    if (body.estado === true) {
      const condicion = await CondicionRegla.findOne({
        where: { reglaCalidadId: regla.id, estado: true },
      });
      if (!condicion) return 'La regla no puede activarse sin una condición válida';
    }
    return null;
  },
  antesDeEliminar: (regla) => (regla.parametroCalidadId ? null : validarCampo(regla.campoFormatoId)),
});
