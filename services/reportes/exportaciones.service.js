const pdf = require('./reportes-pdf.service');
const producto = require('./trazabilidad.service');
const calidad = require('./trazabilidad-calidad.service');
const productoPdf = require('./producto-pdf.presentacion');
const calidadPdf = require('./calidad-pdf.presentacion');

const TITULOS = {
  recepcion: 'Recepciones y proveedores',
  inventario: 'Inventario',
  produccion: 'Órdenes de producción y lotes PT',
  parciales: 'Parciales producidos',
  materiasPrimas: 'Materias primas de las OT',
  solicitudes: 'Adicionales y devoluciones',
  mermas: 'Mermas',
  calidad: 'Calidad y PCC',
  ventas: 'Pedidos y clientes',
  despachos: 'Despachos',
  cronologia: 'Cronología',
};
const seguro = (texto) =>
  String(texto)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 100);
async function exportarProducto(query, usuario) {
  return producto.recorrerCompleto(query, async ({ origen, criterios }, bloques) => {
    // El orden visual exige la cronología al inicio. Se reutilizan las páginas
    // del recorrido existente, sin consultar ni alterar relaciones de negocio.
    const datos = Object.fromEntries(Object.keys(TITULOS).map((clave) => [clave, []]));
    for await (const { bloque, filas } of bloques) datos[bloque].push(...filas);
    const tipos = {
      ot: 'OT',
      pedido: 'Pedido',
      despacho: 'Despacho',
      recepcion: 'Recepción',
      mp: 'Materia prima',
      pt: 'Producto terminado',
    };
    const criteriosPdf = {
      'Tipo de consulta': tipos[criterios.tipo] || criterios.tipo,
      'Documento o producto': criterios.valor || criterios.producto,
    };
    if (criterios.lote) criteriosPdf.Lote = criterios.lote;
    const buffer = await pdf.crear(
      {
        titulo: 'Trazabilidad de producto',
        usuario: usuario.nombre,
        criterios: criteriosPdf,
        horizontal: true,
      },
      (reporte) => productoPdf.presentar(reporte, origen, datos),
    );
    return {
      buffer,
      nombre: `Trazabilidad_Producto_${seguro(criterios.valor || `${criterios.producto}_${criterios.lote}`)}.pdf`,
    };
  });
}

async function exportarCalidad(query, usuario) {
  return calidad.recorrerCompleto(query, async ({ criterios, resumen, reglaConformes }, lotes) => {
    const buffer = await pdf.crear(
      { titulo: 'Trazabilidad de calidad', usuario: usuario.nombre, criterios },
      async (reporte) => {
        calidadPdf.presentarResumen(reporte, resumen, reglaConformes);
        let numero = 0;
        for await (const inspecciones of lotes) {
          for (const inspeccion of inspecciones) {
            calidadPdf.presentarInspeccion(reporte, inspeccion, ++numero);
          }
        }
      },
    );
    return {
      buffer,
      nombre: `Trazabilidad_Calidad_${seguro(query.fechaInicio)}_${seguro(query.fechaFin)}.pdf`,
    };
  });
}

module.exports = { exportarProducto, exportarCalidad };
