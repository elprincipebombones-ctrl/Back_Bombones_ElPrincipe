const test = require('node:test');
const assert = require('node:assert/strict');
const {
  obtenerInforme,
  obtenerTrazabilidadInversa,
  resumenCalidad,
} = require('../services/trazabilidad/informe-trazabilidad.service');
const { construirPdf } = require('../services/trazabilidad/informe-trazabilidad-pdf.service');

const cabecera = {
  resultadoProduccionId: 'res-1', lote: 'LOTE-PT-1', productoId: 'pt-1', productoCodigo: 'PT001',
  productoNombre: 'Producto terminado', productoDescripcion: 'Descripción', cantidadPlaneada: '100',
  cantidadProducida: '95', unidadMedidaId: 'u-1', unidadCodigo: 'KG', unidadNombre: 'Kilogramo',
  unidadSimbolo: 'kg', fechaVencimientoSugerida: null, fechaVencimientoFinal: '2027-01-01',
  bodegaDestinoId: 'b-pt', bodegaDestinoCodigo: 'PT', bodegaDestinoNombre: 'Producto terminado',
  ordenProduccionId: 'ot-1', ordenNumero: 'OT-1', fechaOrden: '2026-10-01', estadoOrden: 'FINALIZADA',
  ordenObservaciones: null, fechaInicio: '2026-10-02T08:00:00Z', fechaSalidaMp: '2026-10-02T07:00:00Z',
  fechaFinalizacion: '2026-10-02T12:00:00Z', movimientoSalidaId: 'mov-sa', movimientoPepId: null,
  movimientoEntradaId: 'mov-en', responsableId: 'usr-1', responsableNombre: 'Responsable',
  responsableCorreo: 'responsable@example.test', usuarioInicioId: 'usr-1', usuarioInicioNombre: 'Responsable',
  usuarioInicioCorreo: 'responsable@example.test', usuarioSalidaId: 'usr-2', usuarioSalidaNombre: 'Almacén',
  usuarioSalidaCorreo: 'almacen@example.test', usuarioFinalizacionId: 'usr-1',
  usuarioFinalizacionNombre: 'Responsable', usuarioFinalizacionCorreo: 'responsable@example.test',
};

const consumo = {
  detalleMovimientoId: 'dm-1', movimientoId: 'mov-sa', tipoDocumento: 'SA', numeroDocumento: 'SA-1',
  fecha: '2026-10-02T07:00:00Z', origen: 'OT', origenId: 'ot-1', productoId: 'mp-1',
  productoCodigo: 'MP001', productoNombre: 'Materia prima', unidadMedidaId: 'u-1', unidad: 'kg',
  cantidad: '20', lote: 'LP-1', loteProveedor: 'LP-1', fechaVencimiento: '2026-12-01',
  bodegaId: 'b-mp', bodegaCodigo: 'MP', bodegaNombre: 'Materia prima', observaciones: null,
  reporteProduccionId: null,
};

function databaseConvencional({ recepciones = 1 } = {}) {
  let llamada = 0;
  const respuestas = [
    [cabecera],
    [consumo],
    [{ id: 'merma-1', tipoMerma: 'MP', productoId: 'mp-1', productoCodigo: 'MP001', productoNombre: 'Materia prima', cantidad: '1', unidadMedidaId: 'u-1', unidad: 'kg', motivoCodigo: 'PROCESO', motivoNombre: 'Proceso', observacion: null, fecha: '2026-10-02', usuarioId: 'usr-1', usuarioNombre: 'Responsable', usuarioCorreo: 'responsable@example.test' }],
    [],
    [{ id: 'mov-en', tipoDocumento: 'EN', numeroDocumento: 'EN-PT-1', fecha: '2026-10-02', estado: 'APLICADO', origen: 'OT', origenId: 'ot-1', bodegaId: 'b-pt', bodega: 'Producto terminado', detalleMovimientoId: 'dm-pt', cantidad: '95', unidad: 'kg', sentido: 'ENTRADA', fechaVencimiento: '2027-01-01' }],
    [],
    [],
    Array.from({ length: recepciones }, (_, indice) => ({ detalleRecepcionId: `dr-${indice}`, productoId: 'mp-1', cantidadRecibida: '50', unidadMedidaId: 'u-1', unidad: 'kg', lote: 'LP-1', fechaVencimiento: '2026-12-01', detalleObservaciones: null, recepcionId: `rec-${indice}`, recepcionNumero: `REC-${indice}`, fechaRecepcion: '2026-09-01', recepcionEstado: 'TERMINADA', tieneNovedades: false, recepcionObservaciones: null, proveedorId: `prov-${indice}`, proveedorDocumento: `900${indice}`, proveedorRazonSocial: `Proveedor ${indice}`, proveedorNombreComercial: null, movimientoEntradaId: `mov-rec-${indice}`, movimientoEntradaNumero: `EN-REC-${indice}`, usuarioRecepcionId: 'usr-r', usuarioRecepcionNombre: 'Recepción', usuarioRecepcionCorreo: 'recepcion@example.test' })),
    Array.from({ length: recepciones }, (_, indice) => ({ recepcionId: `rec-${indice}`, verificacion: { certificado_calidad: true }, condicionAmbiental: null, resultado: { resultado: 'ACEPTADO' } })),
    [], [], [],
  ];
  return {
    state: { escrituras: 0 },
    async query(sql) {
      if (/\b(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i.test(sql)) this.state.escrituras += 1;
      const respuesta = respuestas[llamada++];
      if (respuesta === undefined) throw new Error(`Consulta inesperada ${llamada}: ${sql.slice(0, 80)}`);
      return respuesta;
    },
  };
}

test('consolida trazabilidad convencional, cantidades y recepción única sin escribir', async () => {
  const database = databaseConvencional();
  const informe = await obtenerInforme('LOTE-PT-1', {}, database);
  assert.equal(informe.identificacion.ordenProduccion.modalidad, 'CONVENCIONAL');
  assert.equal(informe.identificacion.cantidadProducida, 95);
  assert.equal(informe.trazabilidadMateriasPrimas.consumos.length, 1);
  assert.equal(informe.trazabilidadMateriasPrimas.consumos[0].cantidad, 20);
  assert.equal(informe.trazabilidadMateriasPrimas.consumos[0].trazabilidadRecepcion.estadoVinculo, 'UNICO');
  assert.equal(informe.procesoProduccion.mermas[0].cantidad, 1);
  assert.equal(database.state.escrituras, 0);
});

test('responde 404 cuando el lote terminado no existe', async () => {
  const database = { async query() { return []; } };
  await assert.rejects(
    obtenerInforme('LOTE-INEXISTENTE', {}, database),
    (error) => error.status === 404 && /no encontrado/i.test(error.message),
  );
});

test('exige desambiguar cuando el lote pertenece a más de una orden o producto', async () => {
  const database = { async query() { return [cabecera, { ...cabecera, productoId: 'pt-2', productoCodigo: 'PT002' }]; } };
  await assert.rejects(
    obtenerInforme('LOTE-PT-1', {}, database),
    (error) => error.status === 409 && error.errors.coincidencias.length === 2,
  );
});

test('no duplica el consumo cuando hay varias recepciones candidatas y declara ambigüedad', async () => {
  const database = databaseConvencional({ recepciones: 2 });
  const informe = await obtenerInforme('LOTE-PT-1', {}, database);
  assert.equal(informe.trazabilidadMateriasPrimas.consumos.length, 1);
  assert.equal(informe.trazabilidadMateriasPrimas.consumos[0].cantidad, 20);
  assert.equal(informe.trazabilidadMateriasPrimas.consumos[0].trazabilidadRecepcion.estadoVinculo, 'AMBIGUO');
  assert.equal(informe.trazabilidadMateriasPrimas.consumos[0].trazabilidadRecepcion.recepciones.length, 2);
});

test('clasifica controles conformes, no conformes, pendientes y ausencia', () => {
  assert.deepEqual(resumenCalidad([]), { conformes: 0, noConformes: 0, pendientes: 0, sinInformacion: 1 });
  assert.deepEqual(resumenCalidad([{ resultadoConsolidado: 'CUMPLE' }, { resultadoConsolidado: 'NO_CUMPLE' }, { resultadoConsolidado: 'PENDIENTE' }]), { conformes: 1, noConformes: 1, pendientes: 1, sinInformacion: 0 });
});

test('usa los movimientos de reportes parciales y conserva desviaciones y acciones correctivas', async () => {
  const parcial = { ...cabecera, movimientoPepId: 'mov-pep' };
  let llamada = 0;
  const respuestas = [
    [parcial], [consumo], [],
    [{ id: 'rep-1', fecha: '2026-10-02', cantidad: '95', lote: 'LOTE-PT-1', productoId: 'pt-1', productoCodigo: 'PT001', productoNombre: 'Producto terminado', unidad: 'kg', movimientoSalidaId: 'mov-consumo', movimientoEntradaId: 'mov-en', usuarioId: 'usr-1', usuarioNombre: 'Responsable', usuarioCorreo: 'responsable@example.test' }],
    [],
    [{ id: 'insp-1', estado: 'CERRADA', fechaInspeccion: '2026-10-02', fechaInicio: '2026-10-02', fechaCompletada: '2026-10-02', fechaCierre: '2026-10-02', observaciones: null, productoId: 'pt-1', productoCodigo: 'PT001', productoNombre: 'Producto terminado', lote: 'LOTE-PT-1', fechaVencimiento: '2027-01-01', formatoId: 'f-1', formatoCodigo: 'TEMP', formatoNombre: 'Temperatura', versionFormatoId: 'vf-1', numeroVersion: 1, tipoInspeccionCodigo: 'PRODUCCION', tipoInspeccionNombre: 'Producción', iniciadaPorId: 'usr-1', iniciadaPorNombre: 'Responsable', iniciadaPorCorreo: 'responsable@example.test', cerradaPorId: 'usr-1', cerradaPorNombre: 'Responsable', cerradaPorCorreo: 'responsable@example.test' }],
    [],
    [], [],
    [{ id: 'des-1', inspeccionId: 'insp-1', estado: 'CERRADA', descripcion: 'Temperatura fuera de rango', mensaje: null, fecha_deteccion: '2026-10-02', detectadaPorId: 'usr-1', detectadaPorNombre: 'Responsable', detectadaPorCorreo: 'responsable@example.test' }],
    [{ id: 'ac-1', desviacionId: 'des-1', estado: 'CERRADA', descripcion: 'Ajuste documentado', responsableUsuarioId: 'usr-1', responsableNombre: 'Responsable', responsableCorreo: 'responsable@example.test' }],
    [], [], [],
    [{ detalleRecepcionId: 'dr-1', productoId: 'mp-1', cantidadRecibida: '50', unidadMedidaId: 'u-1', unidad: 'kg', lote: 'LP-1', fechaVencimiento: '2026-12-01', recepcionId: 'rec-1', recepcionNumero: 'REC-1', fechaRecepcion: '2026-09-01', recepcionEstado: 'TERMINADA', tieneNovedades: false, proveedorId: 'prov-1', proveedorRazonSocial: 'Proveedor', movimientoEntradaId: 'mov-rec', movimientoEntradaNumero: 'EN-REC', usuarioRecepcionId: 'usr-r', usuarioRecepcionNombre: 'Recepción', usuarioRecepcionCorreo: 'recepcion@example.test' }],
    [{ recepcionId: 'rec-1', verificacion: null, condicionAmbiental: null, resultado: { resultado: 'ACEPTADO' } }], [], [], [],
  ];
  const database = { async query() { const r = respuestas[llamada++]; if (r === undefined) throw new Error(`Consulta inesperada ${llamada}`); return r; } };
  const informe = await obtenerInforme('LOTE-PT-1', {}, database);
  assert.equal(informe.identificacion.ordenProduccion.modalidad, 'PARCIAL_PEP');
  assert.equal(informe.procesoProduccion.reportesParciales.length, 1);
  assert.equal(informe.calidad.resumen.noConformes, 1);
  assert.equal(informe.calidad.inspecciones[0].desviaciones[0].accionesCorrectivas[0].id, 'ac-1');
});

test('trazabilidad inversa relaciona MP, OT, lote terminado y entrega sin duplicar', async () => {
  const afectado = {
    detalleMovimientoId: 'dm-1', cantidad: '20', fechaVencimiento: '2026-12-01',
    movimientoId: 'msa-1', movimientoNumero: 'SA-1', fechaConsumo: '2026-10-01',
    origen: 'OT', origenId: 'ot-1', ordenProduccionId: 'ot-1', ordenNumero: 'OT-1',
    ordenEstado: 'FINALIZADA', resultadoProduccionId: 'rp-1', productoTerminadoId: 'pt-1',
    productoTerminadoCodigo: 'PT001', productoTerminadoNombre: 'Terminado',
    loteProductoTerminado: 'LPT-1', cantidadProducida: '90',
    vencimientoProductoTerminado: '2027-01-01', unidadConsumo: 'kg',
    unidadProductoTerminado: 'kg',
  };
  const respuestas = [
    [{ id: 'mp-1', codigo: 'MP001', nombre: 'Materia prima', descripcion: null, tipoProducto: 'MP', unidadMedidaId: 'u-1', unidadCodigo: 'KG', unidadNombre: 'Kilogramo', unidadSimbolo: 'kg' }],
    [{ detalleRecepcionId: 'dr-1', cantidadRecibida: '100', fechaVencimiento: '2026-12-01', recepcionId: 'rec-1', recepcionNumero: 'REC-1', fechaRecepcion: '2026-09-01', recepcionEstado: 'TERMINADA', tieneNovedades: false, proveedorId: 'prov-1', proveedorDocumento: '900', proveedorRazonSocial: 'Proveedor', proveedorNombreComercial: null, movimientoEntradaId: 'men-1', movimientoEntradaNumero: 'EN-1' }],
    [afectado, afectado],
    [{ movimientoId: 'mv-1', operacionId: null, tipoDocumento: 'SA', numeroDocumento: 'SA-V-1', fecha: '2026-10-03', estado: 'APLICADO', origen: 'PEDIDO_VENTA', origenId: 'des-1', observaciones: null, bodegaId: 'b-pt', bodegaCodigo: 'PT', bodegaNombre: 'PT', detalleMovimientoId: 'dpt-1', cantidad: '30', sentido: 'SALIDA', unidadMedidaId: 'u-1', unidad: 'kg', lote: 'LPT-1', fechaVencimiento: '2027-01-01', responsableId: 'u-v', responsableNombre: 'Ventas', responsableCorreo: 'ventas@example.test', pedidoId: 'ped-1', pedidoNumero: 'PED-1', pedidoFecha: '2026-10-03', pedidoObservaciones: null, clienteId: 'cli-1', clienteTipoDocumento: 'NIT', clienteNumeroDocumento: '901', clienteRazonSocial: 'Cliente', clienteNombreComercial: null, clienteDireccionRegistrada: 'Dirección registrada', clienteCiudadRegistrada: 'Ciudad', bodegaDestinoId: null }],
  ];
  let llamada = 0;
  const database = {
    state: { escrituras: 0 },
    async query(sql) {
      if (/\b(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i.test(sql)) this.state.escrituras += 1;
      return respuestas[llamada++];
    },
  };
  const informe = await obtenerTrazabilidadInversa(
    'mp-1',
    'LP-1',
    { fechaVencimiento: '2026-12-01' },
    database,
  );
  assert.equal(informe.produccionAfectada.length, 1);
  assert.equal(informe.produccionAfectada[0].cantidadMateriaPrimaConsumida, 20);
  assert.equal(informe.produccionAfectada[0].consumos.length, 1);
  assert.equal(informe.distribucionAfectada[0].cantidadEntregada, 30);
  assert.equal(informe.distribucionAfectada[0].entregas[0].cliente.razonSocial, 'Cliente');
  assert.equal(database.state.escrituras, 0);
});

test('genera un PDF válido y no vacío desde el contrato del informe', async () => {
  const informe = await obtenerInforme('LOTE-PT-1', {}, databaseConvencional());
  const contenido = await construirPdf(informe);
  assert.equal(contenido.subarray(0, 4).toString(), '%PDF');
  assert.ok(contenido.length > 1000);
});

test('la ruta exige autenticación y permiso antes de exponer los endpoints GET', () => {
  const router = require('../routes/trazabilidad/informe-trazabilidad.routes');
  const rutas = router.stack.filter((capa) => capa.route).map((capa) => ({ path: capa.route.path, methods: capa.route.methods }));
  assert.deepEqual(rutas.map((x) => x.path), ['/lotes', '/materias-primas/:productoId/lotes/:lote', '/lotes/:lote/pdf', '/lotes/:lote']);
  assert.ok(rutas.every((x) => x.methods.get));
  assert.ok(router.stack.filter((capa) => !capa.route).length >= 2);
});
