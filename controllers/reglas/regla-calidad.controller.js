const { ReglaCalidad, CampoFormato, NivelSeveridad } = require('../../models');
const crearCrud = require('../calidad/crearCrud');

module.exports = crearCrud({
  modelo: ReglaCalidad,
  nombre: 'Regla de calidad',
  include: [
    { model: CampoFormato, as: 'campo' },
    { model: NivelSeveridad, as: 'nivelSeveridad' },
  ],
  relaciones: [
    { campo: 'campoFormatoId', modelo: CampoFormato, mensaje: 'Campo de formato no encontrado' },
    {
      campo: 'nivelSeveridadId',
      modelo: NivelSeveridad,
      mensaje: 'Nivel de severidad no encontrado',
    },
  ],
});
