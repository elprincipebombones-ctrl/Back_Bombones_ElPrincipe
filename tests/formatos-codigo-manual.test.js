const test = require('node:test');
const assert = require('node:assert/strict');
const { validationResult } = require('express-validator');
const models = require('../models');
const ctrl = require('../controllers/calidad/formato-calidad.controller');
const validators = require('../validators/calidad/configuracion.validator');
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const validar = async (reglas, body, params = {}) => {
  const req = { body, params, query: {} };
  for (const regla of reglas) await regla.run(req);
  return validationResult(req).array();
};
const res = () => ({
  status() {
    return this;
  },
  json() {
    return this;
  },
});
const next = (error) => {
  throw error;
};

test('el formato exige código manual y rechaza vacíos, códigos inválidos o demasiado largos', async () => {
  for (const codigo of [
    undefined,
    null,
    '',
    '  ',
    'A',
    'f-cal-001',
    'CON ESPACIOS',
    'X'.repeat(31),
  ]) {
    const errors = await validar(validators.crearFormatoValidator, {
      codigo,
      nombre: 'Control',
      tipoInspeccionId: id(1),
    });
    assert.equal(
      errors.some((error) => error.path === 'codigo'),
      true,
      `código inválido: ${codigo}`,
    );
  }
  assert.deepEqual(
    await validar(validators.crearFormatoValidator, {
      codigo: ' F-CAL_001 ',
      nombre: 'Control',
      tipoInspeccionId: id(1),
    }),
    [],
  );
  assert.deepEqual(
    await validar(validators.actualizarFormatoValidator, { estado: false }, { id: id(2) }),
    [],
  );
  assert.equal(
    (await validar(validators.actualizarFormatoValidator, { codigo: '' }, { id: id(2) })).some(
      (error) => error.path === 'codigo',
    ),
    true,
  );
});

test('el modelo de formato no genera código y los demás catálogos siguen generándolo', async (t) => {
  let consultas = 0;
  t.mock.method(models.sequelize, 'query', async () => {
    consultas++;
    return [[{ consecutivo: '99' }]];
  });
  const sinCodigo = models.FormatoCalidad.build({ nombre: 'Control', tipoInspeccionId: id(1) });
  await assert.rejects(sinCodigo.validate(), /codigo/);
  assert.equal(consultas, 0);
  const manual = models.FormatoCalidad.build({
    codigo: 'F-CAL-001',
    nombre: 'Control',
    tipoInspeccionId: id(1),
  });
  await manual.validate();
  assert.equal(manual.codigo, 'F-CAL-001');
  assert.equal(consultas, 0);
  const tipo = models.TipoInspeccion.build({ nombre: 'Visual' });
  await tipo.validate();
  assert.equal(tipo.codigo, 'CA-000099');
  assert.equal(consultas, 1);
});

test('crear y editar formatos conserva el código digitado, también con versión inicial', async (t) => {
  let creado;
  let editado;
  let version;
  let confirmadas = 0;
  t.mock.method(models.sequelize, 'transaction', async () => ({
    commit: async () => {
      confirmadas++;
    },
    rollback: async () => {},
  }));
  t.mock.method(models.TipoInspeccion, 'findByPk', async () => ({ id: id(1) }));
  t.mock.method(models.FormatoCalidad, 'create', async (body) => {
    creado = body;
    return { ...body, id: id(2) };
  });
  t.mock.method(models.VersionFormato, 'create', async (body) => {
    version = body;
  });
  t.mock.method(models.FormatoCalidad, 'findByPk', async () => ({
    id: id(2),
    codigo: 'CA-ANTERIOR',
    update: async (body) => {
      editado = body;
    },
  }));
  await ctrl.crear(
    {
      body: {
        codigo: 'F-CAL-001',
        nombre: 'Control',
        tipoInspeccionId: id(1),
        versionInicial: { numeroVersion: 1 },
      },
    },
    res(),
    next,
  );
  assert.equal(creado.codigo, 'F-CAL-001');
  assert.equal(Object.hasOwn(creado, 'versionInicial'), false);
  assert.equal(version.formatoCalidadId, id(2));
  assert.equal(version.estadoVersion, 'BORRADOR');
  assert.equal(confirmadas, 1);
  await ctrl.actualizar({ params: { id: id(2) }, body: { codigo: 'F-CAL-002' } }, res(), next);
  assert.equal(editado.codigo, 'F-CAL-002');
  await ctrl.actualizar({ params: { id: id(2) }, body: { estado: false } }, res(), next);
  assert.deepEqual(editado, { estado: false });
});

test('un código duplicado revierte la creación y mantiene la respuesta de conflicto', async (t) => {
  const { UniqueConstraintError } = require('sequelize');
  const duplicate = new UniqueConstraintError({ message: 'Código duplicado', errors: [] });
  let reverted = false;
  t.mock.method(models.sequelize, 'transaction', async () => ({
    commit: async () => {},
    rollback: async () => {
      reverted = true;
    },
  }));
  t.mock.method(models.TipoInspeccion, 'findByPk', async () => ({ id: id(1) }));
  t.mock.method(models.FormatoCalidad, 'create', async () => {
    throw duplicate;
  });
  let propagated;
  await ctrl.crear(
    { body: { codigo: 'F-CAL-001', nombre: 'Control', tipoInspeccionId: id(1) } },
    res(),
    (error) => {
      propagated = error;
    },
  );
  assert.equal(reverted, true);
  assert.equal(propagated, duplicate);
  t.mock.method(console, 'error', () => {});
  let status;
  require('../middleware/error')(
    propagated,
    {},
    {
      status(code) {
        status = code;
        return this;
      },
      json() {},
    },
    () => {},
  );
  assert.equal(status, 409);
});
