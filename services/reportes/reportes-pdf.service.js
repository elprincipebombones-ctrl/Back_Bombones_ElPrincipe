const path = require('path');
const PDFDocument = require('pdfkit');

const EMPRESA = 'Bombones de Pollo El Príncipe';
const LOGO = path.join(__dirname, '../../assets/reportes/logo.png');
const AUSENTE = '—';
const VACIO = 'Sin información relacionada';
const COLOR = {
  tinta: '#263446',
  gris: '#637083',
  borde: '#dce1e6',
  suave: '#f4f5f7',
  rojo: '#a92b29',
  rojoSuave: '#f9eaea',
  amarillo: '#fff3cc',
  blanco: '#ffffff',
};
const ETIQUETAS = {
  ot: 'OT',
  codigo_producto: 'Código producto',
  producto_codigo: 'Código producto',
  nombre_formato: 'Nombre del formato',
  fecha_inicio: 'Inicio',
  es_calculado: 'Calculado',
  valor_calculado: 'Valor calculado',
  resultado_cumple: 'Cumple',
  con_desviacion: 'Con desviación',
  conformes: 'Conformes',
  acciones_correctivas: 'Acciones correctivas',
  acciones_abiertas: 'Acciones abiertas',
  pendientes_aprobacion: 'Pendientes de aprobación',
  acciones_cerradas: 'Acciones cerradas',
  cantidadDesviaciones: 'Desviaciones',
  cantidadAcciones: 'Acciones correctivas',
  fecha_aprobacion_cierre: 'Aprobación / cierre',
  aprobador: 'Aprobador / cerrado por',
};
const etiqueta = (clave) =>
  ETIQUETAS[clave] ||
  clave
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
const oculto = (clave) => clave === 'id' || clave.endsWith('_id');
const falta = (valor) => valor === null || valor === undefined || valor === '';
const fechaFormato = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
  timeZone: 'America/Bogota',
});

function fecha(valor) {
  if (falta(valor)) return AUSENTE;
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return valor.split('-').reverse().join('/');
  }
  const date = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(date.getTime())) return String(valor);
  return fechaFormato
    .format(date)
    .replace(/, /g, ' ')
    .replace(/\u00a0|\u202f/g, ' ');
}

function cantidad(valor, unidad) {
  if (falta(valor) || valor === AUSENTE) return AUSENTE;
  let numero =
    typeof valor === 'object' || typeof valor === 'boolean' ? texto(valor) : String(valor);
  if (/^-?\d+\.\d+$/.test(numero)) numero = numero.replace(/0+$/, '').replace(/\.$/, '');
  return `${numero}${falta(unidad) ? '' : ` ${unidad}`}`;
}

function texto(valor, clave = '') {
  if (falta(valor)) return AUSENTE;
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  if (
    valor instanceof Date ||
    (/fecha|inicio|fin|vencimiento/i.test(clave) &&
      typeof valor === 'string' &&
      /^\d{4}-\d{2}-\d{2}(T|$)/.test(valor))
  )
    return fecha(valor);
  if (Array.isArray(valor)) return valor.length ? valor.map((v) => texto(v)).join('\n') : AUSENTE;
  if (typeof valor === 'object') {
    if ('etiqueta' in valor && 'valor' in valor) return texto(valor.etiqueta ?? valor.valor);
    return (
      Object.entries(valor)
        .filter(([k]) => !oculto(k))
        .map(([k, v]) => `${etiqueta(k)}: ${texto(v, k)}`)
        .join('\n') || AUSENTE
    );
  }
  return String(valor)
    .replace(/\uFFFD/g, '?')
    .replace(/\|/g, ' · ')
    .replace(/→/g, ' > ');
}

async function crear({ titulo, usuario, criterios, horizontal = false }, escribir) {
  const doc = new PDFDocument({
    size: 'A4',
    layout: horizontal ? 'landscape' : 'portrait',
    margins: { top: 158, bottom: 62, left: 42, right: 42 },
    autoFirstPage: false,
  });
  const partes = [];
  const terminado = new Promise((resolve, reject) => {
    doc.on('data', (parte) => partes.push(parte));
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.on('error', reject);
  });
  terminado.catch(() => {});
  const generado = fecha(new Date());
  let pagina = 0;
  let pendientes = [];
  let contextoActual = '';
  doc.info.Title = titulo;
  doc.info.Author = usuario || 'Usuario';
  doc.info.Subject = EMPRESA;
  const ancho = () => doc.page.width - 84;
  const limite = () => doc.page.height - 65;
  const fuente = (size = 8.5, bold = false) =>
    doc
      .font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(size)
      .fillColor(COLOR.tinta);

  doc.on('pageAdded', () => {
    pagina++;
    const margenes = doc.page.margins;
    doc.page.margins = { top: 0, bottom: 0, left: 42, right: 42 };
    doc.save();
    doc.image(LOGO, 42, 24, { fit: [52, 52] });
    fuente(12, true).text(EMPRESA, 105, 26, { width: ancho() - 63 });
    fuente(14, true).text(titulo, 105, 46, { width: ancho() - 63 });
    fuente(8)
      .fillColor(COLOR.gris)
      .text(`Generado: ${generado} (America/Bogota)`, 105, 69, { width: ancho() - 63 })
      .text(`Usuario: ${texto(usuario)}`, 42, 92, { width: ancho(), height: 22 });
    const detalle = Object.entries(criterios || {})
      .map(([k, v]) => `${k}: ${texto(v, k)}`)
      .join(' · ');
    fuente(7.4)
      .fillColor(COLOR.gris)
      .text(detalle, 42, 116, { width: ancho(), height: 26, ellipsis: true });
    doc
      .strokeColor(COLOR.rojo)
      .lineWidth(1)
      .moveTo(42, 149)
      .lineTo(42 + ancho(), 149)
      .stroke();
    const pieY = doc.page.height - 40;
    fuente(7)
      .fillColor(COLOR.gris)
      .text(EMPRESA, 42, pieY, { width: ancho() - 105 })
      .text(`Página ${pagina}`, doc.page.width - 142, pieY, { width: 100, align: 'right' })
      .text(`Generación: ${generado}`, 42, pieY + 11, { width: ancho() });
    doc.restore();
    doc.page.margins = margenes;
    fuente();
    doc.x = 42;
    doc.y = 162;
    if (contextoActual) {
      fuente(8, true)
        .fillColor(COLOR.gris)
        .text(contextoActual, 42, 159, { width: ancho(), height: 12, ellipsis: true });
      doc.y = 180;
    }
  });
  doc.addPage();

  function controlSalto(alto = 70) {
    if (doc.y + alto > limite()) doc.addPage();
  }

  function seccion(nombre, nivel = 1) {
    pendientes.push({ nombre, nivel });
  }

  function preparar(alto = 60) {
    if (!pendientes.length) return;
    const h = pendientes.reduce((s, { nombre, nivel }) => {
      fuente(nivel === 1 ? 12 : 10, true);
      return s + doc.heightOfString(nombre, { width: ancho() }) + 18;
    }, 0);
    controlSalto(Math.min(h + alto, limite() - 180));
    for (const { nombre, nivel } of pendientes) {
      fuente(nivel === 1 ? 12 : 10, true)
        .fillColor(nivel === 1 ? COLOR.rojo : COLOR.tinta)
        .text(nombre, 42, doc.y + 6, { width: ancho() });
      doc.y += 8;
    }
    pendientes = [];
  }

  function badgeEstado(valor, x, y, width, height) {
    const estado = texto(valor).toUpperCase();
    let fondo = '#e9edf0';
    if (/RECHAZ|CANCEL|DESVI|NO CUMPLE/.test(estado)) fondo = COLOR.rojoSuave;
    else if (/PENDIENT|ABIERT|PROCESO|ASIGNAD/.test(estado)) fondo = COLOR.amarillo;
    doc.roundedRect(x, y, width, height, 3).fill(fondo);
  }

  function altura(contenido, width, size, bold = false) {
    fuente(size, bold);
    return doc.heightOfString(contenido || ' ', { width, lineGap: 2 });
  }

  // Divide únicamente el texto de presentación: las celdas extensas no se truncan.
  function fragmento(contenido, width, alto, size, bold) {
    if (altura(contenido, width, size, bold) <= alto) return [contenido, ''];
    let min = 1;
    let max = contenido.length;
    while (min < max) {
      const mid = Math.ceil((min + max) / 2);
      if (altura(contenido.slice(0, mid), width, size, bold) <= alto) min = mid;
      else max = mid - 1;
    }
    let corte = min;
    const espacio = contenido.slice(0, corte).search(/\s+\S*$/);
    if (espacio > corte / 2) corte = espacio;
    return [contenido.slice(0, corte), contenido.slice(corte).trimStart()];
  }

  function tabla(columnas, filas, opciones = {}) {
    if (!filas?.length) return sinInformacion();
    const size = opciones.size || 8.5;
    const total = columnas.reduce((s, c) => s + (c.ancho || 1), 0);
    const widths = columnas.map((c) => (ancho() * (c.ancho || 1)) / total);
    const cabeceraH = opciones.sinCabecera
      ? 0
      : Math.max(
          ...columnas.map((c, i) =>
            altura(c.titulo || etiqueta(c.clave), widths[i] - 12, 7.8, true),
          ),
        ) + 14;
    const valores = (fila) =>
      columnas.map((c) => texto(c.valor ? c.valor(fila) : fila[c.clave], c.clave));
    const altoFila = (valoresFila) =>
      Math.max(...valoresFila.map((v, i) => altura(v, widths[i] - 12, size, columnas[i].negrita))) +
      14;

    function pintar(valoresFila, h, header = false, indice = 0) {
      const y = doc.y;
      let x = 42;
      doc
        .rect(x, y, ancho(), h)
        .fill(
          header
            ? COLOR.tinta
            : opciones.destacada
              ? COLOR.rojoSuave
              : opciones.fondo || (indice % 2 ? COLOR.suave : COLOR.blanco),
        );
      valoresFila.forEach((v, i) => {
        const estado =
          typeof columnas[i].estado === 'function'
            ? columnas[i].estado(filas[indice])
            : columnas[i].estado;
        if (!header && estado && v !== AUSENTE) badgeEstado(v, x + 3, y + 3, widths[i] - 6, h - 6);
        fuente(header ? 7.8 : size, header || columnas[i].negrita)
          .fillColor(header ? COLOR.blanco : COLOR.tinta)
          .text(v, x + 6, y + 7, { width: widths[i] - 12, lineGap: 2 });
        x += widths[i];
      });
      doc.strokeColor(COLOR.borde).lineWidth(0.4).rect(42, y, ancho(), h).stroke();
      doc.y = y + h;
      doc.x = 42;
    }

    function cabecera() {
      if (cabeceraH)
        pintar(
          columnas.map((c) => c.titulo || etiqueta(c.clave)),
          cabeceraH,
          true,
        );
    }

    const primeraAltura = altoFila(valores(filas[0]));
    const primeraReserva = primeraAltura + cabeceraH < limite() - 200 ? primeraAltura : 80;
    preparar(cabeceraH + primeraReserva);
    controlSalto(cabeceraH + primeraReserva);
    cabecera();
    filas.forEach((fila, indice) => {
      let resto = valores(fila);
      const h = altoFila(resto);
      const maxFila = limite() - (contextoActual ? 180 : 162) - cabeceraH;
      if (h <= maxFila && doc.y + h > limite()) {
        doc.addPage();
        cabecera();
      }
      while (resto.some((v) => v !== '')) {
        const disponible = limite() - doc.y;
        if (disponible < 32) {
          doc.addPage();
          cabecera();
          continue;
        }
        const trozos = resto.map((v, i) =>
          fragmento(v, widths[i] - 12, disponible - 14, size, columnas[i].negrita),
        );
        const parte = trozos.map(([v]) => v);
        pintar(parte, altoFila(parte), false, indice);
        resto = trozos.map(([, v]) => v);
        if (resto.some((v) => v !== '')) {
          doc.addPage();
          cabecera();
        }
      }
      if (opciones.detalle) opciones.detalle(fila);
    });
    doc.y += 10;
  }

  function gridClaveValor(datos, opciones = {}) {
    const entradas = Array.isArray(datos)
      ? datos
      : Object.entries(datos)
          .filter(([k]) => !oculto(k))
          .map(([k, valor]) => ({
            titulo: etiqueta(k),
            valor: texto(valor, k),
            estado: k === 'estado',
          }));
    if (!entradas.length) return sinInformacion();
    const numero = opciones.columnas || 2;
    const filas = [];
    for (let i = 0; i < entradas.length; i += numero) {
      const fila = {};
      for (let j = 0; j < numero; j++) {
        fila[`label${j}`] = entradas[i + j]?.titulo || ' ';
        fila[`valor${j}`] = entradas[i + j] ? texto(entradas[i + j].valor) : ' ';
        fila[`estado${j}`] = entradas[i + j]?.estado;
      }
      filas.push(fila);
    }
    const columnas = [];
    for (let j = 0; j < numero; j++) {
      columnas.push(
        { clave: `label${j}`, ancho: 1, negrita: true },
        { clave: `valor${j}`, ancho: 1.8, estado: (fila) => fila[`estado${j}`] },
      );
    }
    const estimado = filas.reduce(
      (s, f) =>
        s +
        Math.max(
          ...columnas.map((c) =>
            altura(f[c.clave], ((ancho() / numero) * c.ancho) / 2.8 - 12, 8.5, c.negrita),
          ),
        ) +
        14,
      0,
    );
    // Reservar título y tarjeta juntos antes de dibujar cualquiera de los dos.
    const pequena = estimado < limite() - 205;
    if (pendientes.length) preparar(pequena ? estimado : 80);
    else if (pequena) controlSalto(estimado);
    tabla(columnas, filas, {
      sinCabecera: true,
      fondo: opciones.destacada ? '#fff6dc' : COLOR.suave,
    });
  }

  function tarjetaResumen(nombre, datos, opciones = {}) {
    seccion(nombre, opciones.nivel || 2);
    gridClaveValor(datos, opciones);
  }

  function parrafo(contenido) {
    tabla([{ clave: 'contenido' }], [{ contenido }], { sinCabecera: true });
  }

  function sinInformacion() {
    parrafo(VACIO);
  }

  function indicadores(datos) {
    const entradas = Object.entries(datos);
    const cols = Math.min(4, entradas.length);
    for (let inicio = 0; inicio < entradas.length; inicio += cols) {
      preparar(65);
      controlSalto(65);
      const y = doc.y;
      const w = ancho() / cols;
      entradas.slice(inicio, inicio + cols).forEach(([k, v], i) => {
        const x = 42 + w * i;
        doc.roundedRect(x, y, w - 6, 58, 4).fill(COLOR.suave);
        fuente(18, true)
          .fillColor(COLOR.rojo)
          .text(texto(v), x + 10, y + 8, { width: w - 26 });
        fuente(8).text(etiqueta(k), x + 10, y + 33, { width: w - 26 });
      });
      doc.y = y + 66;
    }
  }

  function cronologia(filas) {
    seccion('Cronología');
    tabla(
      [
        { clave: 'fecha', titulo: 'Fecha', ancho: 1.2 },
        { clave: 'evento', titulo: 'Evento', ancho: 1.2 },
        { clave: 'referencia', titulo: 'Documento', ancho: 1.2 },
        { clave: 'descripcion', titulo: 'Descripción', ancho: 2 },
      ],
      filas,
    );
  }

  function separador() {
    controlSalto(20);
    doc
      .strokeColor(COLOR.borde)
      .moveTo(42, doc.y + 4)
      .lineTo(42 + ancho(), doc.y + 4)
      .stroke();
    doc.y += 15;
  }

  try {
    tarjetaResumen('Criterios de consulta', [
      ...Object.entries(criterios || {}).map(([k, v]) => ({ titulo: k, valor: texto(v, k) })),
      { titulo: 'Fecha generación', valor: generado },
      { titulo: 'Usuario', valor: usuario },
    ]);
    await escribir({
      seccion,
      tarjetaResumen,
      gridClaveValor,
      tabla,
      badgeEstado,
      sinInformacion,
      cronologia,
      separador,
      controlSalto,
      indicadores,
      parrafo,
      contexto: (nombre) => {
        contextoActual = nombre;
      },
      texto,
      cantidad,
      fecha,
      etiqueta,
    });
    preparar();
    doc.end();
    return await terminado;
  } catch (error) {
    doc.destroy(error);
    throw error;
  }
}

module.exports = { crear, texto, cantidad, fecha, etiqueta };
