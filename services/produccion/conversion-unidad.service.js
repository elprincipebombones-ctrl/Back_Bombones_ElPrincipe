const { Op } = require('sequelize');

const { ConversionUnidad, UnidadMedida } = require('../../models');

const calcularCantidadNormalizada = (cantidad, factor) => {
  const valor = Number(cantidad);
  const multiplicador = Number(factor);
  if (!(valor > 0) || !(multiplicador > 0)) {
    const error = new Error('La cantidad y el factor de conversión deben ser mayores que cero');
    error.status = 422;
    throw error;
  }
  return valor * multiplicador;
};

const obtenerFactorConversion = async (unidadOrigenId, unidadDestinoId, transaction) => {
  const [unidadOrigen, unidadDestino] = await Promise.all([
    UnidadMedida.findOne({ where: { id: unidadOrigenId, estado: true }, transaction }),
    UnidadMedida.findOne({ where: { id: unidadDestinoId, estado: true }, transaction }),
  ]);
  if (!unidadOrigen || !unidadDestino) return null;
  if (unidadOrigenId === unidadDestinoId) return 1;

  const conversion = await ConversionUnidad.findOne({
    where: {
      unidadOrigenId,
      unidadDestinoId,
      activo: true,
    },
    transaction,
  });
  return conversion ? Number(conversion.factor) : null;
};

const normalizarCantidad = async ({ cantidad, unidadOrigenId, unidadBaseId, transaction }) => {
  const factor = await obtenerFactorConversion(unidadOrigenId, unidadBaseId, transaction);
  if (factor === null) {
    const error = new Error('La unidad seleccionada no es compatible con la unidad base');
    error.status = 422;
    throw error;
  }
  return {
    cantidadNormalizada: calcularCantidadNormalizada(cantidad, factor),
    factor,
    unidadBaseId,
  };
};

const obtenerUnidadesCompatibles = async (unidadesBaseIds, transaction) => {
  const idsBase = [...new Set(unidadesBaseIds.filter(Boolean))];
  if (!idsBase.length) return new Map();

  const conversiones = await ConversionUnidad.findAll({
    where: {
      unidadDestinoId: { [Op.in]: idsBase },
      activo: true,
    },
    transaction,
    raw: true,
  });
  const idsUnidades = [
    ...new Set([...idsBase, ...conversiones.map((conversion) => conversion.unidadOrigenId)]),
  ];
  const unidades = await UnidadMedida.findAll({
    where: { id: { [Op.in]: idsUnidades }, estado: true },
    order: [['nombre', 'ASC']],
    transaction,
    raw: true,
  });
  const unidadesPorId = new Map(unidades.map((unidad) => [unidad.id, unidad]));
  const resultado = new Map();

  idsBase.forEach((unidadBaseId) => {
    const idsCompatibles = conversiones
      .filter((conversion) => conversion.unidadDestinoId === unidadBaseId)
      .map((conversion) => conversion.unidadOrigenId);
    const compatibles = [unidadBaseId, ...idsCompatibles]
      .map((id) => unidadesPorId.get(id))
      .filter(Boolean);
    resultado.set(unidadBaseId, compatibles);
  });

  return resultado;
};

module.exports = {
  calcularCantidadNormalizada,
  normalizarCantidad,
  obtenerFactorConversion,
  obtenerUnidadesCompatibles,
};
