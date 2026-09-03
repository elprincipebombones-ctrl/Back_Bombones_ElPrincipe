'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { QueryTypes } = require('sequelize');

process.env.PORT = process.env.TEST_PORT || '3020';

const db = require('../models');
const {
  rutaDesdeUrl,
  eliminarSilencioso,
} = require('../services/calidad/almacenamiento-evidencias.service');
require('../app');

const baseUrl = `http://localhost:${process.env.PORT}/api`;
let formato;
let inspeccion;
let evidencia;
let campoObligatorio;
let campoInformativo;

const esperarServidor = async () => {
  for (let intento = 0; intento < 30; intento += 1) {
    try {
      const respuesta = await fetch(`http://localhost:${process.env.PORT}/`);
      if (respuesta.ok) return;
    } catch {
      // La conexión a Neon todavía está iniciando.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('El backend de prueba no inició a tiempo');
};

const crearEscenario = async () => {
  const tipoInspeccion = await db.TipoInspeccion.findOne();
  const criterio = await db.CriterioInspeccion.findOne();
  const elemento = await db.ElementoInspeccion.findOne();
  const usuario = await db.Usuario.findOne();
  const tipoEvidencia = await db.TipoAccion.findOne({ where: { codigo: 'EXIGIR_EVIDENCIA' } });
  const tipoNumero = await db.TipoCampo.findOne({ where: { codigo: 'NUMERO' } });
  assert(tipoInspeccion && criterio && elemento && usuario && tipoEvidencia && tipoNumero);
  const sufijo = crypto.randomUUID().slice(0, 8).toUpperCase();
  formato = await db.FormatoCalidad.create({
    codigo: `HTTP_${sufijo}`,
    nombre: 'Formato temporal evidencia HTTP',
    tipoInspeccionId: tipoInspeccion.id,
  });
  const version = await db.VersionFormato.create({
    formatoCalidadId: formato.id,
    numeroVersion: 1,
    fechaVigenciaDesde: '2026-08-22',
    estadoVersion: 'PUBLICADO',
  });
  const seccion = await db.SeccionFormato.create({
    versionFormatoId: version.id,
    nombre: 'Evidencias',
    orden: 1,
  });
  campoObligatorio = await db.CampoFormato.create({
    seccionFormatoId: seccion.id,
    tipoCampoId: tipoNumero.id,
    codigo: 'TEMPERATURA_OBLIGATORIA',
    etiqueta: 'Temperatura obligatoria',
    esObligatorio: true,
    orden: 1,
  });
  campoInformativo = await db.CampoFormato.create({
    seccionFormatoId: seccion.id,
    tipoCampoId: tipoNumero.id,
    codigo: 'TEMPERATURA_INFORMATIVA',
    etiqueta: 'Temperatura informativa',
    esObligatorio: false,
    orden: 2,
  });
  const checklist = await db.ChecklistSeccion.create({
    seccionFormatoId: seccion.id,
    criterioInspeccionId: criterio.id,
    nombre: 'Checklist evidencia',
    orden: 1,
  });
  const seleccion = await db.ElementoChecklist.create({
    checklistSeccionId: checklist.id,
    elementoInspeccionId: elemento.id,
    codigoSnapshot: elemento.codigo,
    nombreSnapshot: elemento.nombre,
    orden: 1,
  });
  const [{ fecha }] = await db.sequelize.query('SELECT CURRENT_DATE::text AS fecha', {
    type: QueryTypes.SELECT,
  });
  inspeccion = await db.Inspeccion.create({
    versionFormatoId: version.id,
    estado: 'EN_PROCESO',
    fechaInspeccion: fecha,
    iniciadaPor: usuario.id,
    fechaInicio: new Date(),
  });
  const respuesta = await db.RespuestaElementoChecklist.create({
    inspeccionId: inspeccion.id,
    checklistSeccionId: checklist.id,
    elementoChecklistId: seleccion.id,
    elementoInspeccionId: elemento.id,
    criterioInspeccionId: criterio.id,
    resultado: 'NO_CUMPLE',
    cumple: false,
    observacion: 'Prueba HTTP',
    guardadoPor: usuario.id,
    fechaGuardado: new Date(),
  });
  const desviacion = await db.Desviacion.create({
    inspeccionId: inspeccion.id,
    respuestaElementoChecklistId: respuesta.id,
    nivelSeveridadId: criterio.nivelSeveridadId,
    estado: 'ABIERTA',
    fechaDeteccion: new Date(),
    detectadaPor: usuario.id,
  });
  return db.AccionCorrectiva.create({
    desviacionId: desviacion.id,
    tipoAccionId: tipoEvidencia.id,
    estado: 'EN_PROCESO',
    fechaAsignacion: new Date(),
    fechaInicio: new Date(),
  });
};

const main = async () => {
  try {
    await esperarServidor();
    const login = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        correo: process.env.TEST_ADMIN_EMAIL || 'admin@empresa.com',
        password: process.env.TEST_ADMIN_PASSWORD || 'Admin123*',
      }),
    });
    assert.equal(login.status, 200, 'No fue posible autenticar el usuario de prueba');
    const token = (await login.json()).data.token;
    const accion = await crearEscenario();
    const headers = { authorization: `Bearer ${token}` };

    const guardar = (respuestas) =>
      fetch(`${baseUrl}/calidad/inspecciones/${inspeccion.id}/respuestas`, {
        method: 'POST',
        headers: { ...headers, 'content-type': 'application/json' },
        body: JSON.stringify({ respuestas }),
      });
    const primeraCaptura = await guardar([
      { campoFormatoId: campoObligatorio.id, valorNumero: 18 },
      { campoFormatoId: campoInformativo.id, valorNumero: 19 },
    ]);
    assert.equal(primeraCaptura.status, 200);
    const cambioObligatorio = await guardar([
      { campoFormatoId: campoObligatorio.id, valorNumero: 20 },
    ]);
    assert.equal(cambioObligatorio.status, 409);
    assert.match((await cambioObligatorio.json()).message, /obligatorio.*bloqueado/i);
    const cambioInformativo = await guardar([
      { campoFormatoId: campoInformativo.id, valorNumero: 21 },
    ]);
    assert.equal(cambioInformativo.status, 200);
    console.log('✓ Edición de respuestas: obligatorio bloqueado e informativo editable');

    const bandeja = await fetch(`${baseUrl}/calidad/acciones-correctivas?solo_pendientes=true`, {
      headers,
    });
    assert.equal(bandeja.status, 200);
    const accionEnBandeja = (await bandeja.json()).data.find((item) => item.id === accion.id);
    assert.equal(accionEnBandeja.desviacion.inspeccion.id, inspeccion.id);
    assert.equal(accionEnBandeja.desviacion.inspeccion.version.formato.id, formato.id);
    console.log('✓ Bandeja correctiva: acción abierta agrupable con formato e inspección');

    const cierreSinArchivo = await fetch(
      `${baseUrl}/calidad/acciones-correctivas/${accion.id}/cerrar`,
      {
        method: 'POST',
        headers,
      },
    );
    assert.equal(cierreSinArchivo.status, 409);

    const formulario = new FormData();
    formulario.append(
      'archivo',
      new Blob(['%PDF-1.4\n% evidencia de prueba\n'], { type: 'application/pdf' }),
      'evidencia-prueba.pdf',
    );
    const carga = await fetch(`${baseUrl}/calidad/acciones-correctivas/${accion.id}/evidencias`, {
      method: 'POST',
      headers,
      body: formulario,
    });
    if (carga.status !== 201) throw new Error(`Carga HTTP ${carga.status}: ${await carga.text()}`);
    evidencia = (await carga.json()).data;
    assert.equal(evidencia.tipoArchivo, 'application/pdf');

    const descarga = await fetch(`http://localhost:${process.env.PORT}${evidencia.urlArchivo}`, {
      headers,
    });
    assert.equal(descarga.status, 200);
    assert.equal(descarga.headers.get('content-type'), 'application/pdf');

    const cierreConArchivo = await fetch(
      `${baseUrl}/calidad/acciones-correctivas/${accion.id}/cerrar`,
      {
        method: 'POST',
        headers,
      },
    );
    if (cierreConArchivo.status !== 200) {
      throw new Error(`Cierre HTTP ${cierreConArchivo.status}: ${await cierreConArchivo.text()}`);
    }
    const bandejaFinal = await fetch(
      `${baseUrl}/calidad/acciones-correctivas?solo_pendientes=true`,
      { headers },
    );
    assert.equal(
      (await bandejaFinal.json()).data.some((item) => item.id === accion.id),
      false,
    );
    console.log('✓ Evidencia HTTP: sin PDF no cierra; carga, descarga y cierre correctos');
  } finally {
    if (evidencia?.urlArchivo) eliminarSilencioso(rutaDesdeUrl(evidencia.urlArchivo));
    if (inspeccion) await inspeccion.destroy();
    if (formato) await formato.destroy();
    await db.sequelize.close();
  }
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
