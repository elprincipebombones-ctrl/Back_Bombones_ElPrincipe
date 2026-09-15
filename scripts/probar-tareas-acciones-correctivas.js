const assert = require('node:assert/strict');
const { Op } = require('sequelize');
const {
  AccionCorrectiva,
  EvidenciaAccionCorrectiva,
  sequelize,
  TareaAccionCorrectiva,
  Usuario,
} = require('../models');
const {
  presentarTarea,
  validarTareaCompletable,
  validarTareaParaAprobacion,
} = require('../services/calidad/tareas-accion-correctiva.service');

const probar = async () => {
  const transaction = await sequelize.transaction();
  try {
    const accion = await AccionCorrectiva.findOne({
      where: { estado: { [Op.in]: ['PENDIENTE', 'EN_PROCESO'] } },
      include: [{ model: TareaAccionCorrectiva, as: 'tarea', required: false }],
      transaction,
    });
    const usuario = await Usuario.findOne({ where: { estado: true }, transaction });
    assert.ok(accion && usuario, 'Se requiere una acción abierta y un usuario activo para probar');
    assert.equal(accion.tarea, null, 'La acción de prueba ya tiene una tarea asignada');

    const tarea = await TareaAccionCorrectiva.create(
      {
        accionCorrectivaId: accion.id,
        usuarioAsignadoId: usuario.id,
        fechaLimite: '2099-12-31',
        descripcion: 'Tarea transitoria de validación',
      },
      { transaction },
    );

    await assert.rejects(
      () => validarTareaParaAprobacion(accion.id, transaction),
      /Documenta lo realizado/,
    );

    await tarea.update({ documentacion: 'Trabajo ejecutado y verificado' }, { transaction });
    await assert.rejects(
      () => validarTareaCompletable(tarea, transaction),
      /Adjunta al menos una evidencia/,
    );

    await EvidenciaAccionCorrectiva.create(
      {
        accionCorrectivaId: accion.id,
        tareaAccionCorrectivaId: tarea.id,
        nombreArchivo: 'evidencia-prueba.pdf',
        tipoArchivo: 'application/pdf',
        urlArchivo: `/storage/calidad/evidencias/prueba-${tarea.id}.pdf`,
        descripcion: 'Evidencia transitoria de tarea',
        subidoPor: usuario.id,
        fechaCarga: new Date(),
      },
      { transaction },
    );

    await validarTareaCompletable(tarea, transaction);
    await assert.rejects(
      () => validarTareaParaAprobacion(accion.id, transaction),
      /sigue pendiente/,
    );

    await tarea.update({ estado: 'COMPLETADA', fechaCompletada: new Date() }, { transaction });
    await validarTareaParaAprobacion(accion.id, transaction);

    const vencida = presentarTarea({
      id: tarea.id,
      fechaLimite: '2000-01-01',
      estado: 'PENDIENTE',
    });
    assert.equal(vencida.vencida, true);

    console.log(
      JSON.stringify(
        {
          resultado: 'OK',
          tareaOpcionalUnoAUno: true,
          documentacionObligatoria: true,
          evidenciaDeTareaObligatoria: true,
          tareaPendienteBloqueaAprobacion: true,
          tareaCompletadaPermiteContinuar: true,
          vencimientoVisualCalculado: true,
          cambiosPersistidos: false,
        },
        null,
        2,
      ),
    );
  } finally {
    await transaction.rollback();
  }
};

probar()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
