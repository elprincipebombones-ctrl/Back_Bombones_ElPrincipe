const { CampoFormato, RespuestaInspeccion, SeccionFormato } = require('../../models');
const { evaluarRespuesta } = require('./evaluador-reglas.service');

const calcularPorcentaje = (numerador, denominador, multiplicador = 100) => {
  if (
    numerador === null ||
    numerador === undefined ||
    numerador === '' ||
    denominador === null ||
    denominador === undefined ||
    denominador === ''
  ) {
    return null;
  }
  const numero = Number(numerador);
  const divisor = Number(denominador);
  if (!Number.isFinite(numero) || !Number.isFinite(divisor) || divisor === 0) return null;
  return Number(((numero / divisor) * Number(multiplicador || 100)).toFixed(10));
};

const recalcularCampos = async ({
  inspeccion,
  usuarioId,
  observaciones = new Map(),
  transaction,
}) => {
  const campos = await CampoFormato.findAll({
    where: { esCalculado: true, estado: true },
    include: [
      {
        model: SeccionFormato,
        as: 'seccion',
        where: { versionFormatoId: inspeccion.versionFormatoId, estado: true },
        required: true,
      },
    ],
    transaction,
  });
  if (!campos.length) return [];
  const idsFuente = [
    ...new Set(campos.flatMap((campo) => [campo.campoNumeradorId, campo.campoDenominadorId])),
  ];
  const fuentes = await RespuestaInspeccion.findAll({
    where: { inspeccionId: inspeccion.id, campoFormatoId: idsFuente },
    transaction,
  });
  const valores = new Map(
    fuentes.map((respuesta) => [respuesta.campoFormatoId, respuesta.valorNumero]),
  );
  const guardadas = [];
  for (const campo of campos) {
    const valorNumero = calcularPorcentaje(
      valores.get(campo.campoNumeradorId),
      valores.get(campo.campoDenominadorId),
      campo.multiplicador,
    );
    const [respuesta] = await RespuestaInspeccion.findOrCreate({
      where: { inspeccionId: inspeccion.id, campoFormatoId: campo.id },
      defaults: {
        valorNumero,
        observacion: observaciones.get(campo.id) ?? null,
        guardadoPor: usuarioId,
        fechaGuardado: new Date(),
        bloqueada: false,
      },
      transaction,
    });
    await respuesta.update(
      {
        valorNumero,
        observacion: observaciones.has(campo.id)
          ? observaciones.get(campo.id)
          : respuesta.observacion,
        guardadoPor: usuarioId,
        fechaGuardado: new Date(),
      },
      { transaction },
    );
    if (valorNumero !== null) {
      await evaluarRespuesta({
        inspeccion,
        respuesta,
        campo,
        opciones: [],
        usuarioId,
        transaction,
      });
    }
    guardadas.push(respuesta);
  }
  return guardadas;
};

module.exports = { calcularPorcentaje, recalcularCampos };
