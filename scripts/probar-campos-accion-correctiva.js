const assert = require('node:assert/strict');

const {
  sequelize,
  AccionCorrectiva,
  AccionCriterio,
  CampoAccionCorrectiva,
  CampoAccionInstancia,
  CriterioInspeccion,
  NivelSeveridad,
  TipoAccion,
  TipoCampo,
} = require('../models');
const {
  crearSnapshot,
  sincronizarConfiguracion,
} = require('../services/calidad/campos-accion-correctiva.service');
const { validarRequisitosCierre } = require('../services/calidad/acciones-correctivas.service');

const CODIGOS = ['CAUSA_PROBABLE', 'ACCION_CORRECTIVA_INMEDIATA', 'ACCION_PREVENTIVA'];

const ejecutar = async () => {
  const transaction = await sequelize.transaction();

  try {
    const accion = await AccionCorrectiva.findOne({ transaction });
    const tipoCampo = await TipoCampo.findOne({
      where: { estado: true },
      transaction,
    });
    const nivelSeveridad = await NivelSeveridad.findOne({
      where: { estado: true },
      transaction,
    });
    const tipoAccion = await TipoAccion.findOne({
      where: { codigo: 'SOLICITAR_ACCION_CORRECTIVA', estado: true },
      transaction,
    });
    const campos = await CampoAccionCorrectiva.findAll({
      where: { codigo: CODIGOS },
      order: [['orden', 'ASC']],
      transaction,
    });

    assert.ok(accion, 'Se requiere al menos una acción correctiva para la prueba');
    assert.ok(tipoCampo, 'Se requiere al menos un tipo de campo activo');
    assert.ok(nivelSeveridad, 'Se requiere al menos una severidad activa');
    assert.ok(tipoAccion, 'No existe SOLICITAR_ACCION_CORRECTIVA activo');
    assert.equal(campos.length, 3, 'No se encontraron los tres campos iniciales');

    const criterio = await CriterioInspeccion.create(
      {
        codigo: `PRUEBA_ACCION_${Date.now()}`,
        nombre: 'Criterio temporal de prueba',
        pregunta: '¿El criterio cumple?',
        tipoCampoId: tipoCampo.id,
        nivelSeveridadId: nivelSeveridad.id,
        resultadoEsperado: 'CUMPLE',
        estado: true,
      },
      { transaction },
    );

    await AccionCriterio.create(
      {
        criterioInspeccionId: criterio.id,
        tipoAccionId: tipoAccion.id,
        orden: 1,
        estado: true,
      },
      { transaction },
    );

    await sincronizarConfiguracion({
      tipoOrigen: 'CRITERIO',
      origenId: criterio.id,
      campos: campos.map((campo, indice) => ({
        campoAccionCorrectivaId: campo.id,
        orden: indice + 1,
        obligatorioOverride: indice < 2,
      })),
      transaction,
    });

    const cantidadAcciones = await AccionCorrectiva.count({
      where: {
        desviacionId: accion.desviacionId,
        tipoAccionId: accion.tipoAccionId,
      },
      transaction,
    });
    assert.equal(cantidadAcciones, 1, 'Existe más de una acción para la desviación');

    await CampoAccionInstancia.destroy({
      where: { accionCorrectivaId: accion.id },
      transaction,
    });

    await crearSnapshot({
      accionCorrectivaId: accion.id,
      criterioInspeccionId: criterio.id,
      transaction,
    });

    const instancias = await CampoAccionInstancia.findAll({
      where: { accionCorrectivaId: accion.id },
      order: [['orden', 'ASC']],
      transaction,
    });
    assert.equal(instancias.length, 3, 'La acción no contiene los tres campos');
    assert.deepEqual(
      instancias.map((campo) => campo.obligatorio),
      [true, true, false],
      'La obligatoriedad no coincide con la configuración',
    );

    await assert.rejects(
      () => validarRequisitosCierre(accion, transaction),
      /Completa los campos obligatorios/,
      'Se permitió enviar sin diligenciar los campos obligatorios',
    );

    await Promise.all(
      instancias
        .slice(0, 2)
        .map((campo, indice) =>
          campo.update(
            { valorTexto: indice === 0 ? 'Falla de enfriamiento' : 'Ajustar el equipo' },
            { transaction },
          ),
        ),
    );
    try {
      await validarRequisitosCierre(accion, transaction);
    } catch (error) {
      assert.doesNotMatch(
        error.message,
        /Completa los campos obligatorios/,
        'Los campos obligatorios continúan pendientes después de diligenciarlos',
      );
    }

    await campos[0].update({ estado: false }, { transaction });
    const historico = await AccionCorrectiva.findByPk(accion.id, {
      include: [{ model: CampoAccionInstancia, as: 'camposAdicionales' }],
      transaction,
    });
    assert.equal(
      historico.camposAdicionales.length,
      3,
      'Inactivar el maestro alteró el snapshot histórico',
    );
    assert.equal(
      historico.camposAdicionales.find((campo) => campo.codigo === 'ACCION_PREVENTIVA').valorTexto,
      null,
      'El campo opcional no pudo permanecer vacío',
    );

    console.log('OK: se conserva una sola acción correctiva.');
    console.log('OK: el snapshot contiene tres campos ordenados.');
    console.log('OK: los dos campos obligatorios bloquean el envío si están vacíos.');
    console.log('OK: Acción preventiva puede permanecer vacía.');
    console.log('OK: el snapshot histórico sobrevive a la inactivación del maestro.');
  } finally {
    await transaction.rollback();
    await sequelize.close();
  }
};

ejecutar().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
