const PDFDocument = require('pdfkit');

const valor = (dato) => (dato === null || dato === undefined || dato === '' ? 'Sin información' : String(dato));
const fecha = (dato) => (dato ? new Date(dato).toLocaleString('es-CO', { timeZone: 'America/Bogota' }) : 'Sin información');

const construirPdf = (informe) => {
  const doc = new PDFDocument({ size: 'A4', margin: 36, bufferPages: true });
  const partes = [];
  const terminado = new Promise((resolve, reject) => {
    doc.on('data', (parte) => partes.push(parte));
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.on('error', reject);
  }); 
  const titulo = (texto) => {
    if (doc.y > 720) doc.addPage();
    doc.moveDown(0.6).font('Helvetica-Bold').fontSize(13).fillColor('#243447').text(texto);
    doc.moveDown(0.3).font('Helvetica').fontSize(9).fillColor('#111111');
  };
  const linea = (etiqueta, dato) => doc.font('Helvetica-Bold').text(`${etiqueta}: `, { continued: true }).font('Helvetica').text(valor(dato));
  const i = informe.identificacion;
  doc.font('Helvetica-Bold').fontSize(17).fillColor('#243447').text('Informe de trazabilidad y control de calidad');
  doc.font('Helvetica').fontSize(9).fillColor('#555555').text(`Generado: ${fecha(informe.metadata.generadoEn)}`);
  titulo('Identificación del lote');
  linea('Producto', `${i.producto.codigo} - ${i.producto.nombre}`);
  linea('Lote', i.lote);
  linea('Orden de producción', i.ordenProduccion.numero);
  linea('Modalidad', i.ordenProduccion.modalidad);
  linea('Estado de la orden', i.ordenProduccion.estado);
  linea('Cantidad planeada', `${valor(i.cantidadPlaneada)} ${i.unidadMedida.simbolo}`);
  linea('Cantidad producida', `${valor(i.cantidadProducida)} ${i.unidadMedida.simbolo}`);
  linea('Fecha de fabricación/inicio', fecha(i.ordenProduccion.fechaInicio));
  linea('Fecha de finalización', fecha(i.ordenProduccion.fechaFinalizacion));
  linea('Vencimiento', i.fechaVencimientoFinal);
  linea('Responsable', i.responsables.orden?.nombre);

  titulo('Materias primas consumidas');
  if (!informe.trazabilidadMateriasPrimas.consumos.length) doc.text('Sin movimientos de consumo aplicados.');
  for (const consumo of informe.trazabilidadMateriasPrimas.consumos) {
    doc.font('Helvetica-Bold').text(`${consumo.productoCodigo} - ${consumo.productoNombre}`);
    doc.font('Helvetica').text(`Lote: ${valor(consumo.lote)} | Cantidad: ${valor(consumo.cantidad)} ${valor(consumo.unidad)} | Movimiento: ${valor(consumo.numeroDocumento)}`);
    doc.text(`Recepción de origen: ${consumo.trazabilidadRecepcion.estadoVinculo}`);
    for (const recepcion of consumo.trazabilidadRecepcion.recepciones) {
      doc.text(`  ${recepcion.recepcionNumero} - ${recepcion.proveedorRazonSocial} - ${fecha(recepcion.fechaRecepcion)}`);
    }
    doc.moveDown(0.3);
  }

  titulo('Controles de recepción');
  for (const control of informe.trazabilidadMateriasPrimas.controlesRecepcion) {
    doc.font('Helvetica-Bold').text(`Recepción ${control.recepcionId}`);
    doc.font('Helvetica').text(`Resultado: ${valor(control.resultado?.resultado)}`);
    doc.text(`Temperaturas registradas: ${control.temperaturas.length} | Acciones de mejora: ${control.accionesMejora.length}`);
    for (const temperatura of control.temperaturas) {
      doc.text(`  ${temperatura.productoCodigo}: ${valor(temperatura.temperatura)} °C; criterio ${valor(temperatura.criterioMinimo)} a ${valor(temperatura.criterioMaximo)} °C`);
    }
  }

  titulo('Producción y mermas');
  linea('Reportes parciales', informe.procesoProduccion.reportesParciales.length);
  if (!informe.procesoProduccion.mermas.length) doc.text('Sin mermas registradas.');
  for (const merma of informe.procesoProduccion.mermas) {
    doc.text(`${merma.tipoMerma} - ${merma.productoCodigo} ${merma.productoNombre}: ${valor(merma.cantidad)} ${valor(merma.unidad)}. Motivo: ${valor(merma.motivoNombre)}.`);
  }

  titulo('Controles de calidad');
  const r = informe.calidad.resumen;
  doc.text(`Conformes: ${r.conformes} | No conformes: ${r.noConformes} | Pendientes: ${r.pendientes} | Sin información: ${r.sinInformacion}`);
  for (const inspeccion of informe.calidad.inspecciones) {
    doc.moveDown(0.3).font('Helvetica-Bold').text(`${inspeccion.formatoCodigo} - ${inspeccion.formatoNombre}`);
    doc.font('Helvetica').text(`Estado: ${inspeccion.estado} | Resultado: ${inspeccion.resultadoConsolidado} | Fecha: ${fecha(inspeccion.fechaInicio)}`);
    doc.text(`Respuestas: ${inspeccion.respuestas.length} | Checklists: ${inspeccion.checklists.length} | Desviaciones: ${inspeccion.desviaciones.length}`);
    for (const desviacion of inspeccion.desviaciones) {
      doc.text(`  Desviación ${desviacion.estado}: ${valor(desviacion.descripcion || desviacion.mensaje)}. Acciones: ${desviacion.accionesCorrectivas.length}`);
    }
  }

  titulo('Movimientos del producto terminado');
  for (const movimiento of informe.movimientosProductoTerminado) {
    doc.text(`${fecha(movimiento.fecha)} | ${movimiento.tipoDocumento} ${movimiento.numeroDocumento} | ${movimiento.sentido} ${valor(movimiento.cantidad)} ${valor(movimiento.unidad)} | ${movimiento.bodega}`);
  }
  if (!informe.movimientosProductoTerminado.length) doc.text('Sin movimientos aplicados del producto terminado.');

  if (informe.trazabilidadHaciaAdelante) {
    titulo('Trazabilidad hacia adelante');
    linea(
      'Cantidad entregada a clientes',
      `${valor(informe.trazabilidadHaciaAdelante.cantidadEntregada)} ${valor(informe.trazabilidadHaciaAdelante.unidad)}`,
    );
    linea(
      'Cantidad restante total',
      `${valor(informe.trazabilidadHaciaAdelante.cantidadRestanteTotal)} ${valor(informe.trazabilidadHaciaAdelante.unidad)}`,
    );
    for (const entrega of informe.trazabilidadHaciaAdelante.entregas) {
      doc.text(
        `${fecha(entrega.fecha)} | ${entrega.numeroDocumento} | ${valor(entrega.cantidad)} ${valor(entrega.unidad)} | Cliente: ${valor(entrega.cliente?.razonSocial || entrega.cliente?.nombreComercial)}`,
      );
    }
    for (const existencia of informe.trazabilidadHaciaAdelante.existenciasPorBodega) {
      doc.text(
        `Existencia ${existencia.bodegaNombre}: ${valor(existencia.cantidadRestante)} ${valor(existencia.unidad)}`,
      );
    }
    if (!informe.trazabilidadHaciaAdelante.devolucionesClienteSoportadas) {
      doc.text('Devoluciones comerciales de producto terminado: no soportadas por el modelo actual.');
    }
  }

  if (informe.metadata.advertencias.length) {
    titulo('Advertencias y limitaciones del expediente');
    for (const advertencia of informe.metadata.advertencias) doc.text(`• ${advertencia}`);
  }
  const paginas = doc.bufferedPageRange();
  for (let pagina = paginas.start; pagina < paginas.start + paginas.count; pagina += 1) {
    doc.switchToPage(pagina);
    doc.fontSize(8).fillColor('#666666').text(`Página ${pagina + 1} de ${paginas.count}`, 36, 806, { align: 'right', width: 523 });
  } 
  doc.end();
  return terminado;
};

module.exports = { construirPdf };
