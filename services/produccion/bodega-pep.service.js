const { Bodega } = require('../../models');

const CODIGO_BODEGA_PEP = 'PEP';

const resolverBodegaPep = async (transaction) => {
  const bodega = await Bodega.findOne({
    where: { codigo: CODIGO_BODEGA_PEP, estado: true },
    transaction,
  });
  if (!bodega) {
    throw Object.assign(new Error('No existe una bodega PRODUCTO EN PROCESO (PEP) activa'), {
      status: 409,
    });
  }
  return bodega;
};

module.exports = { CODIGO_BODEGA_PEP, resolverBodegaPep };
