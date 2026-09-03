'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { Op } = require('sequelize');
const db = require('../models');
const { crearVersion, publicarVersion } = require('../services/calidad/versiones-formato.service');
const {
  fechaActual,
  cerrarSiVencida,
  validarEditable,
} = require('../services/calidad/bloqueo-diario.service');
const { validarRequisitosCierre } = require('../services/calidad/acciones-correctivas.service');

const contarContenido = async (versionId, transaction) => {
  const secciones = await db.SeccionFormato.findAll({
    where: { versionFormatoId: versionId },
    transaction,
  });
  const seccionIds = secciones.map((item) => item.id);
  const campos = await db.CampoFormato.findAll({
    where: { seccionFormatoId: seccionIds },
    transaction,
  });
  const checklists = await db.ChecklistSeccion.findAll({
    where: { seccionFormatoId: seccionIds },
    transaction,
  });
  const elementos = await db.ElementoChecklist.count({
    where: { checklistSeccionId: checklists.map((item) => item.id) },
    transaction,
  });
  return {
    secciones: secciones.length,
    campos: campos.length,
    checklists: checklists.length,
    elementos,
  };
};

const main = async () => {
  await db.sequelize.authenticate();
  const transaction = await db.sequelize.transaction();
  try {
    const tipoInspeccion = await db.TipoInspeccion.findOne({ transaction });
    const tipoCampo = await db.TipoCampo.findOne({ transaction });
    const criterio = await db.CriterioInspeccion.findOne({ transaction });
    const elemento = await db.ElementoInspeccion.findOne({ transaction });
    const usuario = await db.Usuario.findOne({ transaction });
    assert(
      tipoInspeccion && tipoCampo && criterio && elemento && usuario,
      'Faltan catálogos base de Calidad',
    );

    const sufijo = crypto.randomUUID().slice(0, 8).toUpperCase();
    const formato = await db.FormatoCalidad.create(
      {
        codigo: `TEST_${sufijo}`,
        nombre: 'Formato temporal de prueba',
        tipoInspeccionId: tipoInspeccion.id,
        estado: true,
      },
      { transaction },
    );
    const v1 = await db.VersionFormato.create(
      {
        formatoCalidadId: formato.id,
        numeroVersion: 1,
        fechaVigenciaDesde: '2026-08-01',
        estadoVersion: 'PUBLICADO',
        publicadoPor: usuario.id,
        fechaPublicacion: new Date(),
      },
      { transaction },
    );
    const seccion = await db.SeccionFormato.create(
      {
        versionFormatoId: v1.id,
        nombre: 'Control operativo',
        orden: 1,
        estado: true,
      },
      { transaction },
    );
    await db.CampoFormato.create(
      {
        seccionFormatoId: seccion.id,
        tipoCampoId: tipoCampo.id,
        codigo: 'MEDICION',
        etiqueta: 'Medición',
        esObligatorio: true,
        bloquearAlGuardar: true,
        orden: 1,
        estado: true,
      },
      { transaction },
    );
    const checklist = await db.ChecklistSeccion.create(
      {
        seccionFormatoId: seccion.id,
        criterioInspeccionId: criterio.id,
        nombre: 'Checklist rápido',
        orden: 2,
        estado: true,
      },
      { transaction },
    );
    await db.ElementoChecklist.create(
      {
        checklistSeccionId: checklist.id,
        elementoInspeccionId: elemento.id,
        codigoSnapshot: elemento.codigo,
        nombreSnapshot: elemento.nombre,
        orden: 1,
        estado: true,
      },
      { transaction },
    );

    const programacion = await db.ProgramacionFormato.create(
      {
        formatoCalidadId: formato.id,
        fechaInicio: '2026-08-01',
        activo: true,
      },
      { transaction },
    );
    await db.DiaProgramacion.bulkCreate(
      [1, 2, 3, 4, 5, 6].map((diaSemana) => ({
        programacionFormatoId: programacion.id,
        diaSemana,
      })),
      { transaction },
    );
    const sabado = await db.ProgramacionFormato.count({
      where: { id: programacion.id },
      include: [{ model: db.DiaProgramacion, as: 'dias', where: { diaSemana: 6 } }],
      transaction,
    });
    const domingo = await db.ProgramacionFormato.count({
      where: { id: programacion.id },
      include: [{ model: db.DiaProgramacion, as: 'dias', where: { diaSemana: 7 } }],
      transaction,
    });
    assert.equal(sabado, 1);
    assert.equal(domingo, 0);
    console.log('✓ Programación lunes-sábado: aparece sábado y no domingo');

    const v2 = await crearVersion({
      formatoCalidadId: formato.id,
      datos: { fechaVigenciaDesde: '2026-08-22', modo: 'COPIAR_PUBLICADA' },
      transaction,
    });
    assert.equal(v2.estadoVersion, 'BORRADOR');
    assert.deepEqual(
      await contarContenido(v2.id, transaction),
      await contarContenido(v1.id, transaction),
    );
    await publicarVersion({ versionId: v2.id, usuarioId: usuario.id, transaction });
    await v1.reload({ transaction });
    assert.equal(v1.estadoVersion, 'OBSOLETO');
    assert.equal(
      await db.VersionFormato.count({
        where: { formatoCalidadId: formato.id, estadoVersion: 'PUBLICADO' },
        transaction,
      }),
      1,
    );
    let restriccionActiva = false;
    const savepoint = await db.sequelize.transaction({ transaction });
    try {
      await db.VersionFormato.create(
        {
          formatoCalidadId: formato.id,
          numeroVersion: 3,
          fechaVigenciaDesde: '2026-08-22',
          estadoVersion: 'PUBLICADO',
        },
        { transaction: savepoint },
      );
      await savepoint.commit();
    } catch (error) {
      restriccionActiva = error.name === 'SequelizeUniqueConstraintError';
      await savepoint.rollback();
    }
    assert(restriccionActiva, 'La base debe impedir dos versiones PUBLICADO');
    console.log('✓ Clonado y publicación: v2 borrador, v1 obsoleta y una sola publicada');

    const hoy = await fechaActual(transaction);
    const ayer = new Date(`${hoy}T12:00:00Z`);
    ayer.setUTCDate(ayer.getUTCDate() - 1);
    const vencida = await db.Inspeccion.create(
      {
        versionFormatoId: v2.id,
        estado: 'EN_PROCESO',
        fechaInspeccion: ayer.toISOString().slice(0, 10),
        iniciadaPor: usuario.id,
        fechaInicio: ayer,
      },
      { transaction },
    );
    await cerrarSiVencida(vencida, transaction);
    assert.equal(vencida.estado, 'CERRADA_INCOMPLETA');
    const actual = await db.Inspeccion.create(
      {
        versionFormatoId: v2.id,
        estado: 'EN_PROCESO',
        fechaInspeccion: hoy,
        iniciadaPor: usuario.id,
        fechaInicio: new Date(),
      },
      { transaction },
    );
    await validarEditable(actual, transaction);
    assert.equal(
      await db.RespuestaElementoChecklist.count({
        where: { inspeccionId: actual.id },
        transaction,
      }),
      0,
    );
    console.log('✓ Bloqueo diario: hoy editable, día anterior cerrada incompleta');
    console.log('✓ Checklist inicial: sin persistencia; la UI lo presenta visualmente en CUMPLE');

    const elementoCopiado = await db.ElementoChecklist.findOne({
      include: [
        {
          model: db.ChecklistSeccion,
          as: 'checklist',
          where: {
            seccionFormatoId: {
              [Op.in]: (
                await db.SeccionFormato.findAll({ where: { versionFormatoId: v2.id }, transaction })
              ).map((s) => s.id),
            },
          },
        },
      ],
      transaction,
    });
    const respuesta = await db.RespuestaElementoChecklist.create(
      {
        inspeccionId: actual.id,
        checklistSeccionId: elementoCopiado.checklistSeccionId,
        elementoChecklistId: elementoCopiado.id,
        elementoInspeccionId: elementoCopiado.elementoInspeccionId,
        criterioInspeccionId: criterio.id,
        resultado: 'NO_CUMPLE',
        cumple: false,
        observacion: 'Prueba de no conformidad',
        guardadoPor: usuario.id,
        fechaGuardado: new Date(),
      },
      { transaction },
    );
    const desviacion = await db.Desviacion.create(
      {
        inspeccionId: actual.id,
        respuestaElementoChecklistId: respuesta.id,
        nivelSeveridadId: criterio.nivelSeveridadId,
        estado: 'ABIERTA',
        fechaDeteccion: new Date(),
        detectadaPor: usuario.id,
      },
      { transaction },
    );
    const evidenciaTipo = await db.TipoAccion.findOne({
      where: { codigo: 'EXIGIR_EVIDENCIA' },
      transaction,
    });
    const medicionTipo = await db.TipoAccion.findOne({
      where: { codigo: 'VOLVER_A_MEDIR' },
      transaction,
    });
    assert(evidenciaTipo && medicionTipo, 'Faltan tipos de acción para validar evidencias');
    const accionEvidencia = await db.AccionCorrectiva.create(
      {
        desviacionId: desviacion.id,
        tipoAccionId: evidenciaTipo.id,
        fechaAsignacion: new Date(),
      },
      { transaction },
    );
    accionEvidencia.tipoAccion = evidenciaTipo;
    await assert.rejects(() => validarRequisitosCierre(accionEvidencia, transaction), /evidencia/);
    await db.EvidenciaAccionCorrectiva.create(
      {
        accionCorrectivaId: accionEvidencia.id,
        nombreArchivo: 'prueba.pdf',
        tipoArchivo: 'application/pdf',
        urlArchivo: '/api/calidad/archivos-evidencia/prueba.pdf',
        subidoPor: usuario.id,
        fechaCarga: new Date(),
      },
      { transaction },
    );
    await validarRequisitosCierre(accionEvidencia, transaction);
    const accionMedicion = await db.AccionCorrectiva.create(
      {
        desviacionId: desviacion.id,
        tipoAccionId: medicionTipo.id,
        fechaAsignacion: new Date(),
      },
      { transaction },
    );
    accionMedicion.tipoAccion = medicionTipo;
    await assert.rejects(() => validarRequisitosCierre(accionMedicion, transaction), /medición/);
    await db.SeguimientoAccionCorrectiva.create(
      {
        accionCorrectivaId: accionMedicion.id,
        tipoRegistro: 'NUEVA_MEDICION',
        resultadoCumple: true,
        registradoPor: usuario.id,
        fechaRegistro: new Date(),
      },
      { transaction },
    );
    await validarRequisitosCierre(accionMedicion, transaction);
    console.log('✓ Acciones: evidencia y nueva medición obligatorias antes de cerrar');

    await transaction.rollback();
    console.log('✓ Pruebas revertidas: Neon no conserva datos temporales');
  } catch (error) {
    await transaction.rollback();
    throw error;
  } finally {
    await db.sequelize.close();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
