const assert = require('node:assert/strict');

const baseUrl = process.env.QA_BASE_URL || 'http://localhost:3000/api';

const solicitar = async (ruta, opciones = {}) => {
  const respuesta = await fetch(`${baseUrl}${ruta}`, opciones);
  const body = await respuesta.json();
  assert(respuesta.ok, `${opciones.method || 'GET'} ${ruta}: ${respuesta.status} ${body.message}`);
  return body.data;
};

const ejecutar = async () => {
  const login = await solicitar('/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo: 'admin@empresa.com', password: 'Admin123*' }),
  });
  const headers = { Authorization: `Bearer ${login.token}` };
  const parametros = await solicitar('/calidad/parametros', { headers });
  const cloro = parametros.find(p => p.codigo === 'CLORO_AGUA_POTABLE');
  const ph = parametros.find(p => p.codigo === 'PH');
  assert.equal(cloro.tipoCampo.codigo, 'NUMERO');
  assert.equal(cloro.reglas.filter(r => r.estado).length, 3);
  assert.equal(ph.reglas.filter(r => r.estado).length, 3);

  const reglas = await solicitar('/reglas/reglas-calidad', { headers });
  assert(reglas.every(r => r.parametroCalidadId), 'Hay reglas sin parámetro');
  assert(reglas.every(r => r.parametro && r.condiciones && r.acciones), 'El detalle de reglas está incompleto');

  const formatos = await solicitar('/calidad/formatos', { headers });
  const temp = formatos.find(f => f.codigo === 'TEMP-CAVA');
  const versiones = await solicitar(`/calidad/formatos/${temp.id}/versiones`, { headers });
  const publicada = versiones.find(v => v.estadoVersion === 'PUBLICADO');
  const completa = await solicitar(`/calidad/versiones-formato/${publicada.id}/completa`, { headers });
  const campoTemperatura = completa.secciones.flatMap(s => s.campos).find(c => c.parametro?.codigo === 'TEMPERATURA');
  assert.equal(campoTemperatura.parametro.reglas.filter(r => r.estado).length, 1);
  console.log(JSON.stringify({ ok: true, parametros: parametros.length, reglas: reglas.length,
    cloroEscenarios: 3, phEscenarios: 3, tempCavaReglasHeredadas: 1 }, null, 2));
};

ejecutar().catch((error) => { console.error(error); process.exitCode = 1; });
