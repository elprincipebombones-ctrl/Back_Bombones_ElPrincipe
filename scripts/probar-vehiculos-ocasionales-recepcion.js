const assert = require('node:assert/strict');
const { Recepcion, RecepcionVehiculo, Vehiculo, sequelize } = require('../models');

const probar = async () => {
  const transaction = await sequelize.transaction();
  try {
    const recepcion = await Recepcion.findOne({
      where: { estado: 'EN_PROCESO' },
      transaction,
    });
    assert.ok(recepcion, 'Se necesita una recepción EN_PROCESO para ejecutar la prueba');

    const sufijo = Date.now().toString().slice(-6);
    const placaOcasional = `T${sufijo}`.slice(0, 20);
    const ocasional = await RecepcionVehiculo.create(
      {
        recepcionId: recepcion.id,
        vehiculoId: null,
        placaSnapshot: placaOcasional,
        tipoVehiculoSnapshot: 'Furgón ocasional',
        marcaSnapshot: 'Marca histórica',
        modeloSnapshot: 'Modelo histórico',
      },
      { transaction },
    );
    assert.equal(ocasional.vehiculoId, null);

    const placaMaestro = `M${sufijo}`.slice(0, 20);
    const maestro = await Vehiculo.create(
      {
        codigo: `PRUEBA-${sufijo}`,
        placa: placaMaestro,
        tipoVehiculo: 'Camión',
        marca: 'Marca inicial',
        modelo: 'Modelo inicial',
        proveedorId: recepcion.proveedorId,
        estado: true,
      },
      { transaction },
    );
    const registrado = await RecepcionVehiculo.create(
      {
        recepcionId: recepcion.id,
        vehiculoId: maestro.id,
        placaSnapshot: maestro.placa,
        tipoVehiculoSnapshot: maestro.tipoVehiculo,
        marcaSnapshot: maestro.marca,
        modeloSnapshot: maestro.modelo,
      },
      { transaction },
    );

    await maestro.update({ marca: 'Marca modificada' }, { transaction });
    await registrado.reload({ transaction });
    assert.equal(registrado.marcaSnapshot, 'Marca inicial');

    await assert.rejects(
      () =>
        RecepcionVehiculo.create(
          {
            recepcionId: recepcion.id,
            vehiculoId: null,
            placaSnapshot: placaOcasional,
          },
          { transaction },
        ),
      /Validation error/,
    );

    console.log(
      JSON.stringify(
        {
          resultado: 'OK',
          vehiculoIdOcasionalNullable: true,
          snapshotHistorico: true,
          placaDuplicadaBloqueada: true,
          cambiosPersistidos: false,
        },
        null,
        2,
      ),
    );
  } finally {
    if (!transaction.finished) await transaction.rollback();
  }
};

probar()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
