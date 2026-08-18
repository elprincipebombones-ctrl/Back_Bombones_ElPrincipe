/* eslint-disable no-console */
const assert = require('assert');

const baseUrl = process.env.API_URL || 'http://localhost:3000/api';
let token = '';

const request = async (ruta, options = {}) => {
  const response = await fetch(`${baseUrl}${ruta}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  const body = await response.json();
  assert(response.ok, `${options.method || 'GET'} ${ruta}: ${response.status} ${JSON.stringify(body)}`);
  return body.data;
};

(async () => {
  const sesion = await request('/auth/login', {
    method: 'POST', body: JSON.stringify({ correo: 'admin@empresa.com', password: 'Admin123*' }),
  });
  token = sesion.token;
  const categorias = await request('/calidad/categorias-elemento');
  assert.equal(categorias.length, 4);
  const equipos = categorias.find((categoria) => categoria.codigo === 'EQUIPOS');
  assert(equipos, 'No se encontró la categoría EQUIPOS');
  const elementos = await request(`/calidad/elementos-inspeccion?categoria_id=${equipos.id}&estado=true`);
  assert.equal(elementos.length, 15);
  const criterios = await request('/calidad/criterios-inspeccion');
  const criterio = criterios.find((item) => item.codigo === 'LIMPIO_DESINFECTADO');
  assert.equal(criterio.acciones.filter((accion) => accion.estado).length, 3);

  const formatos = await request('/calidad/formatos');
  const validarFormato = async (codigo, esperados) => {
    const formato = formatos.find((item) => item.codigo === codigo);
    assert(formato, `No se encontró ${codigo}`);
    const versiones = await request(`/calidad/formatos/${formato.id}/versiones`);
    const completa = await request(`/calidad/versiones-formato/${versiones[0].id}/completa`);
    const cantidades = completa.secciones.flatMap((seccion) => seccion.checklists || [])
      .map((checklist) => checklist.elementos.length).sort((a, b) => a - b);
    assert.deepEqual(cantidades, esperados);
  };
  await validarFormato('VERIF_DIARIA_LYD', [13]);
  await validarFormato('VERIF_LYD_BANOS', [6, 11]);
  console.log('OK: categorías, elementos, criterios y versiones completas de checklists.');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
