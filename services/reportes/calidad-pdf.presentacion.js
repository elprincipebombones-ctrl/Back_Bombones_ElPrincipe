function presentarResumen(reporte, resumen, reglaConformes) {
  reporte.seccion('Indicadores del rango');
  reporte.indicadores(resumen);
  reporte.parrafo(reglaConformes);
}

function presentarInspeccion(reporte, inspeccion, numero) {
  const { texto, cantidad, etiqueta, fecha } = reporte;
  const c = (clave, titulo, ancho = 1, extra = {}) => ({ clave, titulo, ancho, ...extra });
  const tiene = (v) => v !== null && v !== undefined && v !== '';
  const detalle = (r, claves) =>
    claves
      .filter((k) => tiene(r[k]))
      .map((k) => `${etiqueta(k)}: ${texto(r[k], k)}`)
      .join('\n') || '—';
  const medido = (r) => {
    if (r.origen === 'CHECKLIST') return detalle(r, ['resultado', 'cumple']);
    return cantidad(texto(r.valor), r.unidad);
  };

  function desviaciones(filas) {
    if (!filas?.length) return reporte.sinInformacion();
    filas.forEach((d) => {
      reporte.tabla(
        [
          c('parametro', 'Origen / parámetro', 1.2, {
            valor: (r) => detalle(r, ['origen', 'parametro', 'criterio', 'regla', 'nombre_regla']),
          }),
          c('valor_obtenido', 'Obtenido / esperado', 1.1, {
            valor: (r) =>
              `Obtenido: ${cantidad(r.valor_obtenido, r.unidad)}\nEsperado: ${texto(r.resultado_esperado)}\nMínimo: ${cantidad(r.valor_minimo, r.unidad)}\nMáximo: ${cantidad(r.valor_maximo, r.unidad)}`,
          }),
          c('estado', 'Estado / severidad', 0.9, {
            valor: (r) =>
              detalle(r, [
                'estado',
                'severidad',
                'fecha_deteccion',
                'operador_logico',
                'resultado_regla',
              ]),
          }),
          c('observacion', 'Hallazgo y evidencia', 1.6, {
            valor: (r) =>
              detalle(r, [
                'observacion',
                'mensaje',
                'mensaje_regla',
                'observacion_respuesta',
                'evidencia',
              ]),
          }),
        ],
        [d],
        { destacada: true },
      );
      if (d.condiciones?.length) {
        reporte.seccion('Condiciones registradas de la regla', 2);
        reporte.tabla(
          [
            c('tipo', 'Tipo'),
            c('operador', 'Operador'),
            c('valor_1', 'Valor 1'),
            c('valor_2', 'Valor 2'),
            c('valores', 'Valores', 1.5),
          ],
          d.condiciones,
        );
      }
    });
  }

  reporte.contexto(`Inspección ${numero} · ${texto(inspeccion.contexto.formato)}`);
  reporte.separador();
  reporte.tarjetaResumen(
    `Inspección ${numero}: ${texto(inspeccion.contexto.formato)}`,
    inspeccion.contexto,
    { nivel: 1 },
  );
  reporte.indicadores({
    Desviaciones: inspeccion.cantidadDesviaciones,
    'Acciones correctivas': inspeccion.cantidadAcciones,
  });
  reporte.seccion('Resultados diligenciados', 2);
  reporte.tabla(
    [
      c('seccion', 'Sección / tipo', 1.1, {
        valor: (r) => [texto(r.seccion), `${texto(r.origen)} · ${texto(r.tipo)}`].join('\n'),
      }),
      c('parametro', 'Parámetro / elemento', 1.5, {
        valor: (r) =>
          [...new Set([r.campo, r.parametro, r.checklist, r.elemento].filter(tiene))].join('\n') ||
          '—',
      }),
      c('valor', 'Resultado', 1.1, {
        valor: (r) =>
          `${medido(r)}${r.es_calculado ? `\nCalculado: ${cantidad(r.valor_calculado, r.unidad)}` : ''}`,
      }),
      c('criterio', 'Referencia registrada', 1.2, {
        valor: (r) =>
          r.origen === 'CHECKLIST'
            ? detalle(r, ['criterio', 'resultado_esperado'])
            : `Mín: ${cantidad(r.valor_minimo, r.unidad)}\nMáx: ${cantidad(r.valor_maximo, r.unidad)}\nCalculado: ${texto(r.es_calculado)}`,
      }),
      c('observacion', 'Observación / registro', 1.4, {
        valor: (r) => detalle(r, ['observacion', 'evidencia', 'fecha_guardado']),
      }),
    ],
    inspeccion.respuestas,
  );

  reporte.seccion('Desviaciones registradas', 2);
  desviaciones(inspeccion.desviaciones);
  reporte.seccion('Acciones correctivas', 2);
  if (!inspeccion.acciones.length) reporte.sinInformacion();
  inspeccion.acciones.forEach((accion, indice) => {
    const { campos, seguimientos, evidencias, tareas, origen, contexto_origen, ...contexto } =
      accion;
    reporte.tarjetaResumen(`Acción correctiva ${indice + 1} · inspección ${numero}`, contexto, {
      destacada: true,
    });
    if (contexto_origen && Object.keys(contexto_origen).length) {
      reporte.tarjetaResumen('Contexto de origen de la acción', contexto_origen);
    }
    reporte.seccion('Desviación de origen', 2);
    desviaciones(origen && Object.keys(origen).length ? [origen] : []);
    reporte.seccion('Causa, medidas y campos de la acción', 2);
    reporte.tabla(
      [
        c('nombre', 'Campo', 1.4, { valor: (r) => `${texto(r.nombre)}\n${texto(r.codigo)}` }),
        c('valor', 'Información registrada', 3),
        c('obligatorio', 'Obligatorio', 0.8),
      ],
      campos,
    );
    reporte.seccion('Tareas asociadas', 2);
    reporte.tabla(
      [
        c('descripcion', 'Tarea / documentación', 2, {
          valor: (r) => detalle(r, ['descripcion', 'documentacion']),
        }),
        c('responsable', 'Responsable', 1.2),
        c('estado', 'Estado', 1, { estado: true }),
        c('fecha_limite', 'Límite / completada', 1.3, {
          valor: (r) => `${fecha(r.fecha_limite)}\n${fecha(r.fecha_completada)}`,
        }),
      ],
      tareas,
    );
    reporte.seccion('Evidencias y documentación', 2);
    reporte.tabla(
      [
        c('nombre_archivo', 'Archivo / tipo', 1.4, {
          valor: (r) => detalle(r, ['nombre_archivo', 'tipo_archivo']),
        }),
        c('descripcion', 'Descripción / relación', 2, {
          valor: (r) => detalle(r, ['descripcion', 'seguimiento_relacionado', 'tarea_relacionada']),
        }),
        c('subido_por', 'Cargado por', 1),
        c('fecha_carga', 'Fecha', 1.2),
      ],
      evidencias,
    );
    reporte.seccion('Seguimientos y nuevas mediciones', 2);
    reporte.tabla(
      [
        c('tipo', 'Tipo / descripción', 1.6, { valor: (r) => detalle(r, ['tipo', 'descripcion']) }),
        c('valores', 'Medición / resultado', 1.4, {
          valor: (r) =>
            [
              tiene(r.valor_numero) ? `Medición\n${cantidad(r.valor_numero, r.unidad)}` : null,
              detalle(r, ['valor_texto', 'valor_booleano', 'resultado_cumple']),
            ]
              .filter(tiene)
              .join('\n\n'),
        }),
        c('registrado_por', 'Registrado por', 1.1),
        c('fecha_registro', 'Fecha', 1.2),
      ],
      seguimientos,
    );
  });
}

module.exports = { presentarResumen, presentarInspeccion };
