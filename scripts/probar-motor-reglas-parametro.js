const assert = require('node:assert/strict');
const db = require('../models');
const { evaluarRespuesta } = require('../services/calidad/evaluador-reglas.service');

const ejecutar = async () => {
  const transaction = await db.sequelize.transaction();
  try {
    const usuario = await db.Usuario.findOne({ transaction });
    const formato = await db.FormatoCalidad.findOne({ where: { codigo: 'TEMP-CAVA' }, transaction });
    const version = await db.VersionFormato.findOne({
      where: { formatoCalidadId: formato.id, estadoVersion: 'PUBLICADO' }, transaction,
    });
    const seccion = await db.SeccionFormato.findOne({ where: { versionFormatoId: version.id }, transaction });
    assert(usuario && formato && version && seccion, 'Faltan datos base para la prueba');

    const asegurarCampo = async (codigoParametro) => {
      const parametro = await db.ParametroCalidad.findOne({ where: { codigo: codigoParametro }, transaction });
      assert(parametro, `No existe el parámetro ${codigoParametro}`);
      let campo = await db.CampoFormato.findOne({ where: { parametroCalidadId: parametro.id }, transaction });
      if (!campo) campo = await db.CampoFormato.create({
        seccionFormatoId: seccion.id, parametroCalidadId: parametro.id,
        tipoCampoId: parametro.tipoCampoId, unidadMedidaId: parametro.unidadMedidaId,
        codigo: `QA_${codigoParametro}`.slice(0, 30), etiqueta: parametro.nombre, orden: 999,
        valorMinimo: parametro.valorMinimo, valorMaximo: parametro.valorMaximo,
        precisionDecimal: parametro.precisionDecimal, estado: true,
      }, { transaction });
      return campo;
    };

    const probar = async (codigoParametro, valor, esperado, accionesMinimas = []) => {
      const campo = await asegurarCampo(codigoParametro);
      const inspeccion = await db.Inspeccion.create({
        versionFormatoId: version.id, estado: 'BORRADOR', fechaInspeccion: '2026-08-16',
        iniciadaPor: usuario.id, fechaInicio: new Date(), observaciones: 'Prueba transaccional',
      }, { transaction });
      const respuesta = await db.RespuestaInspeccion.create({
        inspeccionId: inspeccion.id, campoFormatoId: campo.id, valorNumero: valor,
        guardadoPor: usuario.id, fechaGuardado: new Date(), bloqueada: false,
      }, { transaction });
      await evaluarRespuesta({ inspeccion, respuesta, campo, opciones: [], usuarioId: usuario.id, transaction });
      const desviaciones = await db.Desviacion.findAll({ where: { respuestaInspeccionId: respuesta.id }, transaction });
      assert.equal(desviaciones.length, esperado, `${codigoParametro}=${valor}: desviaciones inesperadas`);
      if (esperado) {
        const acciones = await db.AccionCorrectiva.findAll({
          where: { desviacionId: desviaciones[0].id },
          include: [{ model: db.TipoAccion, as: 'tipoAccion' }], transaction,
        });
        const codigos = new Set(acciones.map(a => a.tipoAccion.codigo));
        for (const codigo of accionesMinimas) assert(codigos.has(codigo), `Falta acción ${codigo}`);
      }
      return { parametro: codigoParametro, valor, desviaciones: desviaciones.length };
    };

    const resultados = [];
    resultados.push(await probar('CLORO_AGUA_POTABLE', 0.2, 1, ['GENERAR_ALERTA', 'VOLVER_A_MEDIR']));
    resultados.push(await probar('CLORO_AGUA_POTABLE', 1, 0));
    resultados.push(await probar('CLORO_AGUA_POTABLE', 2.1, 1, ['GENERAR_ALERTA']));
    resultados.push(await probar('PH', 6, 1, ['VOLVER_A_MEDIR']));
    resultados.push(await probar('PH', 7, 0));
    resultados.push(await probar('PH', 10, 1, ['GENERAR_ALERTA']));
    resultados.push(await probar('TEMPERATURA', 2, 0));
    resultados.push(await probar('TEMPERATURA', 6, 1, ['EXIGIR_OBSERVACION', 'GENERAR_ALERTA']));
    console.log(JSON.stringify({ ok: true, resultados, persistencia: 'ROLLBACK' }, null, 2));
  } finally {
    await transaction.rollback();
  }
};

ejecutar()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => db.sequelize.close());
