const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const columnas = (detalle) =>
  detalle === 'kardex'
    ? [
        ['fecha', 'Fecha'],
        ['numeroDocumento', 'Documento'],
        ['bodega', 'Bodega'],
        ['codigo', 'C?digo'],
        ['unidad', 'Unidad'],
        ['lote', 'Lote'],
        ['entradas', 'Entradas'],
        ['salidas', 'Salidas'],
        ['saldo', 'Saldo'],
        ['nota', 'Nota'],
      ]
    : detalle
      ? [
          ['fecha', 'Fecha'],
          ['numeroDocumento', 'Documento'],
          ['codigo', 'Código'],
          ['nombre', 'Producto'],
          ['bodega', 'Bodega'],
          ['sentido', 'Sentido'],
          ['cantidad', 'Cantidad'],
          ['unidad', 'Unidad'],
          ['lote', 'Lote'],
        ]
      : [
          ['codigo', 'Código'],
          ['nombre', 'Producto'],
          ['descripcion', 'Descripción'],
          ['clasificacion', 'Clasificación'],
          ['unidad', 'Unidad'],
          ['frecuencia', 'Frecuencia'],
          ['inventarioDisponible', 'Disponible'],
          ['entradas', 'Entradas'],
          ['salidas', 'Salidas'],
          ['movimientoNeto', 'Neto'],
          ['promedioMensual', 'Prom. mes'],
          ['stockSeguridad', 'Stock seguridad'],
          ['movimientosSinSentido', 'Sin sentido'],
        ];
async function exportar(res, data, formato, detalle) {
  const cols = columnas(detalle);
  const titulo =
    detalle === 'kardex'
      ? 'Kardex por producto y bodega'
      : detalle
        ? 'Detalle de movimientos'
        : 'Control estadístico de inventario';
  const periodo = `${data.metadata.fechaDesde} a ${data.metadata.fechaHasta} (America/Bogota)`;
  if (formato === 'xlsx') {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Informe');
    sheet.columns = cols.map(([key, header]) => ({ key, header, width: 22 }));
    sheet.addRows(
      data.filas.map((f) =>
        Object.fromEntries(
          cols.map(([key]) => {
            const valor = f[key];
            const numerico = [
              'cantidad',
              'entradas',
              'salidas',
              'saldo',
              'frecuencia',
              'inventarioDisponible',
              'movimientoNeto',
              'promedioMensual',
              'stockSeguridad',
              'movimientosSinSentido',
            ].includes(key);
            return [
              key,
              valor === null || valor === undefined
                ? 'Pendiente'
                : numerico
                  ? Number(valor)
                  : valor,
            ];
          }),
        ),
      ),
    );
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
    const info = workbook.addWorksheet('Criterios');
    info.addRow([titulo, periodo]);
    for (const [key, value] of Object.entries(data.metadata))
      info.addRow([key, typeof value === 'object' ? JSON.stringify(value) : value]);
    info.columns = [{ width: 25 }, { width: 100 }];
    const buffer = await workbook.xlsx.writeBuffer();
    res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.attachment('inventario.xlsx');
    return res.send(Buffer.from(buffer));
  }
  const doc = new PDFDocument({ size: 'A3', layout: 'landscape', margin: 28 });
  const chunks = [];
  const buffer = new Promise((resolve, reject) => {
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  const width = (doc.page.width - 56) / cols.length;
  let y;
  const header = () => {
    doc.font('Helvetica-Bold').fontSize(15).text(titulo, 28, 28);
    doc.font('Helvetica').fontSize(9).text(periodo, 28, 50);
    doc.text(
      detalle === 'kardex'
        ? 'Saldo acumulado por bodega y unidad. Incluye saldo anterior al rango; pendiente si hay movimientos sin sentido.'
        : 'Promedio = salidas / (días / 30). Stock = promedio / 0.5. Disponible: saldo actual; pendiente si faltan sentidos.',
      28,
      65,
    );
    y = 90;
    cols.forEach(([, label], i) =>
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .text(label, 28 + i * width, y, { width: width - 5 }),
    );
    y += 30;
  };
  header();
  for (const row of data.filas) {
    doc.font('Helvetica').fontSize(8);
    const values = cols.map(([key]) => String(row[key] ?? 'Pendiente'));
    const height = Math.max(
      22,
      ...values.map((value) => doc.heightOfString(value, { width: width - 5 }) + 10),
    );
    if (y + height > doc.page.height - 35) {
      doc.addPage();
      header();
    }
    doc.font('Helvetica').fontSize(8);
    values.forEach((value, i) => doc.text(value, 28 + i * width, y, { width: width - 5 }));
    y += height;
  }
  if (detalle === 'kardex') {
    doc.addPage();
    doc.font('Helvetica-Bold').fontSize(15).text('Saldos del período por bodega y unidad');
    doc.moveDown().font('Helvetica').fontSize(10).text(periodo);
    for (const s of data.saldos || []) {
      doc
        .moveDown()
        .text(
          `${s.bodega} (${s.unidad}) — Inicial: ${s.saldoInicial ?? 'Pendiente'} | Entradas: ${s.entradas} | Salidas: ${s.salidas} | Final: ${s.saldoFinal ?? 'Pendiente'}`,
        );
    }
  }
  doc.end();
  res.type('application/pdf');
  res.attachment('inventario.pdf');
  return res.send(await buffer);
}
module.exports = { exportar, columnas };
