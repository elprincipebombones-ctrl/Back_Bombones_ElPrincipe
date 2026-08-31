const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { validationResult } = require('express-validator');
const db = require('../models');
const categoriaController = require('../controllers/calidad/categoria-lugar-inspeccion.controller');
const lugarController = require('../controllers/calidad/lugar-inspeccion.controller');
const inspeccionController = require('../controllers/calidad/inspeccion.controller');
const ejecucionValidator = require('../validators/calidad/ejecucion.validator');

const respuesta = () => {
  let cuerpo;
  const res = {
    statusCode: 200,
    status(codigo) {
      this.statusCode = codigo;
      return this;
    },
    json(valor) {
      cuerpo = valor;
      return valor;
    },
  };
  return { res, cuerpo: () => cuerpo };
};

const ejecutar = async (controlador, req) => {
  const salida = respuesta();
  await controlador(req, salida.res, (error) => {
    if (error) throw error;
  });
  return salida.cuerpo();
};

const validarCreacionInspeccion = async (body) => {
  const req = { body, params: {}, query: {} };
  for (const validador of ejecucionValidator.crearInspeccionValidator) {
    await validador.run(req);
  }
  return validationResult(req);
};

const ids = {
  categoria: null,
  lugares: [],
  inspeccion: null,
  respuesta: null,
  desviacion: null,
  accion: null,
};

const limpiar = async () => {
  if (ids.accion) await db.AccionCorrectiva.destroy({ where: { id: ids.accion } });
  if (ids.desviacion) await db.Desviacion.destroy({ where: { id: ids.desviacion } });
  if (ids.respuesta) await db.RespuestaInspeccion.destroy({ where: { id: ids.respuesta } });
  if (ids.inspeccion) await db.Inspeccion.destroy({ where: { id: ids.inspeccion } });
  if (ids.lugares.length) await db.LugarInspeccion.destroy({ where: { id: ids.lugares } });
  if (ids.categoria) {
    await db.CategoriaLugarInspeccion.destroy({ where: { id: ids.categoria } });
  }
};

const probar = async () => {
  const sufijo = randomUUID().slice(0, 8);
  const categoria = (
    await ejecutar(categoriaController.crear, {
      body: { nombre: `PRUEBA LUGARES ${sufijo}` },
      params: {},
      query: {},
    })
  ).data;
  ids.categoria = categoria.id;

  const lugarUno = (
    await ejecutar(lugarController.crear, {
      body: {
        nombre: `Lugar de prueba A ${sufijo}`,
        categoriaLugarInspeccionId: categoria.id,
      },
      params: {},
      query: {},
    })
  ).data;
  ids.lugares.push(lugarUno.id);

  const lugarDos = (
    await ejecutar(lugarController.crear, {
      body: {
        nombre: `Lugar de prueba B ${sufijo}`,
        categoriaLugarInspeccionId: categoria.id,
      },
      params: {},
      query: {},
    })
  ).data;
  ids.lugares.push(lugarDos.id);

  assert.equal(lugarUno.orden, 1, 'El primer lugar debe recibir orden 1');
  assert.equal(lugarDos.orden, 2, 'El segundo lugar debe recibir orden 2');

  await ejecutar(lugarController.actualizar, {
    body: { estado: false },
    params: { id: lugarUno.id },
    query: {},
  });
  const activos = await ejecutar(lugarController.listar, {
    body: {},
    params: {},
    query: { categoria_id: categoria.id, solo_activos: 'true' },
  });
  assert.deepEqual(
    activos.data.map((lugar) => lugar.id),
    [lugarDos.id],
    'El lugar inactivo no debe estar disponible para iniciar',
  );

  const version = await db.VersionFormato.findOne({
    where: { estadoVersion: 'PUBLICADO' },
    include: [
      {
        model: db.SeccionFormato,
        as: 'secciones',
        required: true,
        include: [{ model: db.CampoFormato, as: 'campos', required: true }],
      },
    ],
  });
  const usuario = await db.Usuario.findOne({ where: { estado: true } });
  const tipoAccion = await db.TipoAccion.findOne({ where: { estado: true } });
  assert.ok(version && usuario && tipoAccion, 'Se requieren datos operativos para la prueba');

  const sinLugar = await validarCreacionInspeccion({
    formatoCalidadId: version.formatoCalidadId,
  });
  assert.ok(!sinLugar.isEmpty(), 'La API debe rechazar una inspección nueva sin lugar');

  const conLugar = await validarCreacionInspeccion({
    formatoCalidadId: version.formatoCalidadId,
    lugarInspeccionId: lugarDos.id,
  });
  assert.ok(conLugar.isEmpty(), 'Categoría y lugar válidos deben superar la validación');

  await assert.rejects(
    () =>
      ejecutar(inspeccionController.crear, {
        body: {
          formatoCalidadId: version.formatoCalidadId,
          lugarInspeccionId: lugarUno.id,
        },
        params: {},
        query: {},
        usuario: { id: usuario.id },
      }),
    (error) => error.status === 422,
    'La API debe rechazar un lugar inactivo',
  );

  const creada = await ejecutar(inspeccionController.crear, {
    body: {
      formatoCalidadId: version.formatoCalidadId,
      lugarInspeccionId: lugarDos.id,
    },
    params: {},
    query: {},
    usuario: { id: usuario.id },
  });
  ids.inspeccion = creada.data.id;
  assert.equal(creada.data.lugarInspeccion.id, lugarDos.id);
  assert.equal(creada.data.lugarInspeccion.categoria.id, categoria.id);

  const intentoCambioLugar = await ejecutar(inspeccionController.actualizar, {
    body: { lugarInspeccionId: lugarUno.id },
    params: { id: ids.inspeccion },
    query: {},
    usuario: { id: usuario.id },
  });
  assert.equal(intentoCambioLugar.success, false);
  assert.match(intentoCambioLugar.message, /no se puede cambiar/i);

  const campo = version.secciones[0].campos[0];
  const respuestaInspeccion = await db.RespuestaInspeccion.create({
    inspeccionId: ids.inspeccion,
    campoFormatoId: campo.id,
    valorTexto: 'NO_CUMPLE - prueba de lugar',
    guardadoPor: usuario.id,
    fechaGuardado: new Date(),
  });
  ids.respuesta = respuestaInspeccion.id;

  const desviacion = await db.Desviacion.create({
    inspeccionId: ids.inspeccion,
    respuestaInspeccionId: respuestaInspeccion.id,
    descripcion: 'NO_CUMPLE transitorio para validar el transporte del lugar',
    estado: 'ABIERTA',
    fechaDeteccion: new Date(),
    detectadaPor: usuario.id,
  });
  ids.desviacion = desviacion.id;

  const accion = await db.AccionCorrectiva.create({
    desviacionId: desviacion.id,
    tipoAccionId: tipoAccion.id,
    descripcion: 'Acción transitoria de prueba',
    estado: 'PENDIENTE',
    responsableId: usuario.id,
    fechaAsignacion: new Date(),
  });
  ids.accion = accion.id;

  const accionConLugar = await db.AccionCorrectiva.findByPk(accion.id, {
    include: [
      {
        model: db.Desviacion,
        as: 'desviacion',
        include: [
          {
            model: db.Inspeccion,
            as: 'inspeccion',
            include: [
              {
                model: db.LugarInspeccion,
                as: 'lugarInspeccion',
                include: [{ model: db.CategoriaLugarInspeccion, as: 'categoria' }],
              },
            ],
          },
        ],
      },
    ],
  });
  assert.equal(accionConLugar.desviacion.inspeccion.lugarInspeccion.id, lugarDos.id);

  const historica = await db.Inspeccion.findOne({
    where: { lugarInspeccionId: null },
    include: [{ model: db.LugarInspeccion, as: 'lugarInspeccion' }],
  });
  assert.ok(historica, 'Debe existir una inspección histórica para probar compatibilidad');
  assert.equal(historica.lugarInspeccion, null);

  console.log(
    JSON.stringify(
      {
        resultado: 'OK',
        ordenCategoria: categoria.orden,
        ordenLugares: [lugarUno.orden, lugarDos.orden],
        lugaresActivosTrasInactivar: activos.data.length,
        inspeccionCreadaConLugar: lugarDos.nombre,
        lugarInmutableTrasIniciar: true,
        accionCorrectivaConMismoLugar: true,
        historicoSinLugarCompatible: true,
      },
      null,
      2,
    ),
  );
};

probar()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await limpiar();
    await db.sequelize.close();
  });
