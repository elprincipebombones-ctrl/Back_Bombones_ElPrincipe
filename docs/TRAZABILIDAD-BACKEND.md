# API del informe de trazabilidad y control de calidad

## Seguridad y alcance

Todos los endpoints requieren `Authorization: Bearer <token>` y el permiso existente
`produccion.control.ver`. El módulo es exclusivamente de lectura: no ejecuta inserciones,
actualizaciones, eliminaciones ni cambios de estado.

Base URL: `/api/trazabilidad`.

## Endpoints

### Buscar lotes terminados

`GET /api/trazabilidad/lotes`

Filtros opcionales:

| Parámetro | Tipo | Descripción |
| --- | --- | --- |
| `lote` | string, máximo 100 | Búsqueda parcial, sin distinguir mayúsculas. |
| `productoId` | UUID | Limita al producto terminado. |
| `ordenProduccionId` | UUID | Limita a una orden. |
| `estadoOrden` | string, máximo 40 | Estado exacto de la OT. |
| `fechaDesde` | `YYYY-MM-DD` | Fecha inicial de la orden, inclusiva. |
| `fechaHasta` | `YYYY-MM-DD` | Fecha final de la orden, inclusiva. |
| `pagina` | entero >= 1 | Predeterminado: 1. |
| `limite` | entero 1–200 | Predeterminado: 50. |

Respuesta: `data.filas`, `data.total`, `data.pagina` y `data.limite`. Cada fila contiene
`resultadoProduccionId`, `lote`, `productoId`, `productoCodigo`, `productoNombre`,
`cantidadPlaneada`, `cantidadProducida`, `unidad`, `fechaVencimiento`, `bodegaDestinoId`,
`bodegaDestino`, `ordenProduccionId`, `ordenNumero`, `estadoOrden`, `fechaOrden`,
`fechaInicio` y `fechaFinalizacion`.

### Consultar informe JSON

`GET /api/trazabilidad/lotes/:lote`

Filtros opcionales: `productoId` y `ordenProduccionId`. Deben usarse si el mismo texto de lote
está asociado a más de un producto u orden. `:lote` debe tener entre 1 y 100 caracteres.

### Descargar PDF

`GET /api/trazabilidad/lotes/:lote/pdf`

Admite los mismos filtros del detalle. Devuelve `application/pdf` como
`trazabilidad-<lote>.pdf`.

### Trazabilidad inversa de materia prima

`GET /api/trazabilidad/materias-primas/:productoId/lotes/:lote`

Parámetros de ruta:

- `productoId`: UUID del producto clasificado como materia prima/insumo/material, no PT.
- `lote`: lote de materia prima, máximo 100 caracteres.

Filtro opcional:

- `fechaVencimiento`: `YYYY-MM-DD`. Se recomienda enviarlo porque el mismo texto de lote puede
  existir con vencimientos diferentes.

Devuelve recepción y proveedor, órdenes que consumieron realmente la existencia, resultados y
lotes terminados afectados, y entregas/clientes de esos lotes cuando proceden de pedidos de venta.

## Contrato JSON completo

Los valores del ejemplo son **ilustrativos** y no se crean ni almacenan. Los arreglos muestran
un objeto completo del tipo que pueden contener. Un valor no disponible se entrega como `null`;
un conjunto sin registros se entrega como `[]`. Los campos históricos provenientes de tablas de
Calidad o Recepción pueden incluir además `createdAt` y `updatedAt` (o sus nombres persistidos
`created_at`/`updated_at`) cuando la tabla fuente los conserva.

```json
{
  "success": true,
  "message": "Informe de trazabilidad",
  "data": {
    "metadata": {
      "generadoEn": "2026-10-18T15:00:00.000Z",
      "soloLectura": true,
      "criterioLoteInventario": "COALESCE(lote,loteProveedor)",
      "advertencias": []
    },
    "identificacion": {
      "lote": "LOTE-000123",
      "producto": {
        "id": "00000000-0000-0000-0000-000000000001",
        "codigo": "PT-001",
        "nombre": "Producto terminado ilustrativo",
        "descripcion": "Valor ilustrativo"
      },
      "ordenProduccion": {
        "id": "00000000-0000-0000-0000-000000000002",
        "numero": "OT-000123",
        "estado": "FINALIZADA",
        "fecha": "2026-10-17",
        "fechaInicio": "2026-10-17T13:00:00.000Z",
        "fechaSalidaMateriasPrimas": "2026-10-17T12:00:00.000Z",
        "fechaFinalizacion": "2026-10-17T18:00:00.000Z",
        "observaciones": null,
        "modalidad": "CONVENCIONAL"
      },
      "cantidadPlaneada": 100,
      "cantidadProducida": 96.5,
      "unidadMedida": {
        "id": "00000000-0000-0000-0000-000000000003",
        "codigo": "KG",
        "nombre": "Kilogramo",
        "simbolo": "kg"
      },
      "fechaVencimientoSugerida": null,
      "fechaVencimientoFinal": "2027-01-17",
      "bodegaDestino": {
        "id": "00000000-0000-0000-0000-000000000004",
        "codigo": "PT",
        "nombre": "Producto terminado"
      },
      "responsables": {
        "orden": { "id": "uuid", "nombre": "Usuario ilustrativo", "correo": "usuario@example.test" },
        "inicio": { "id": "uuid", "nombre": "Usuario ilustrativo", "correo": "usuario@example.test" },
        "salidaMateriasPrimas": { "id": "uuid", "nombre": "Usuario ilustrativo", "correo": "usuario@example.test" },
        "finalizacion": { "id": "uuid", "nombre": "Usuario ilustrativo", "correo": "usuario@example.test" }
      }
    },
    "trazabilidadMateriasPrimas": {
      "consumos": [
        {
          "detalleMovimientoId": "uuid",
          "movimientoId": "uuid",
          "tipoDocumento": "SA",
          "numeroDocumento": "SA-000123",
          "fecha": "2026-10-17T12:00:00.000Z",
          "origen": "OT",
          "origenId": "uuid-orden",
          "productoId": "uuid-mp",
          "productoCodigo": "MP-001",
          "productoNombre": "Materia prima ilustrativa",
          "unidadMedidaId": "uuid-unidad",
          "unidad": "kg",
          "cantidad": 25.5,
          "lote": "LOTE-PROVEEDOR-01",
          "loteProveedor": "LOTE-PROVEEDOR-01",
          "fechaVencimiento": "2026-12-31",
          "bodegaId": "uuid-bodega",
          "bodegaCodigo": "MP",
          "bodegaNombre": "Materias primas",
          "observaciones": null,
          "reporteProduccionId": null,
          "trazabilidadRecepcion": {
            "detalleMovimientoId": "uuid",
            "estadoVinculo": "UNICO",
            "criterioVinculo": "PRODUCTO_LOTE_VENCIMIENTO",
            "recepciones": [
              {
                "detalleRecepcionId": "uuid",
                "productoId": "uuid-mp",
                "cantidadRecibida": 100,
                "unidadMedidaId": "uuid-unidad",
                "unidad": "kg",
                "lote": "LOTE-PROVEEDOR-01",
                "fechaVencimiento": "2026-12-31",
                "detalleObservaciones": null,
                "recepcionId": "uuid-recepcion",
                "recepcionNumero": "REC-000123",
                "fechaRecepcion": "2026-10-10T14:00:00.000Z",
                "recepcionEstado": "TERMINADA",
                "tieneNovedades": false,
                "recepcionObservaciones": null,
                "proveedorId": "uuid-proveedor",
                "proveedorDocumento": "900000000",
                "proveedorRazonSocial": "Proveedor ilustrativo SAS",
                "proveedorNombreComercial": "Proveedor ilustrativo",
                "movimientoEntradaId": "uuid-movimiento",
                "movimientoEntradaNumero": "EN-000123",
                "responsable": { "id": "uuid", "nombre": "Receptor ilustrativo", "correo": "receptor@example.test" }
              }
            ]
          }
        }
      ],
      "controlesRecepcion": [
        {
          "recepcionId": "uuid-recepcion",
          "verificacion": {
            "id": "uuid",
            "recepcion_id": "uuid-recepcion",
            "certificado_calidad": true,
            "plagas": false,
            "rotulado_correcto": true,
            "condiciones_embalaje": true,
            "apariencia_color_textura": true,
            "empaque_embalaje": true,
            "olor": true,
            "created_at": "2026-10-10T14:00:00.000Z",
            "updated_at": "2026-10-10T14:00:00.000Z"
          },
          "condicionAmbiental": {
            "id": "uuid",
            "recepcion_id": "uuid-recepcion",
            "temperatura_cava": "4.00",
            "desinfeccion_realizada": true,
            "desinfectante_area": "Valor registrado",
            "concentracion_desinfeccion": "Valor registrado",
            "observaciones": null,
            "created_at": "2026-10-10T14:00:00.000Z",
            "updated_at": "2026-10-10T14:00:00.000Z"
          },
          "resultado": {
            "id": "uuid",
            "recepcion_id": "uuid-recepcion",
            "resultado": "ACEPTADO",
            "observaciones": null,
            "fecha_decision": "2026-10-10T15:00:00.000Z",
            "created_at": "2026-10-10T15:00:00.000Z",
            "updated_at": "2026-10-10T15:00:00.000Z"
          },
          "temperaturas": [
            {
              "id": "uuid",
              "recepcion_id": "uuid-recepcion",
              "producto_id": "uuid-mp",
              "detalle_recepcion_id": "uuid-detalle",
              "condicion_termica": "REFRIGERADO",
              "temperatura": 3.5,
              "hora": "09:30:00",
              "observaciones": null,
              "created_at": "2026-10-10T14:00:00.000Z",
              "updated_at": "2026-10-10T14:00:00.000Z",
              "recepcionId": "uuid-recepcion",
              "productoId": "uuid-mp",
              "detalleRecepcionId": "uuid-detalle",
              "productoCodigo": "MP-001",
              "productoNombre": "Materia prima ilustrativa",
              "criterioMinimo": 0,
              "criterioMaximo": 4
            }
          ],
          "accionesMejora": [
            {
              "id": "uuid",
              "recepcion_id": "uuid-recepcion",
              "origen": "TEMPERATURA",
              "detalle_recepcion_id": "uuid-detalle",
              "control": "temperatura:uuid-detalle",
              "afectacion": "PRODUCTO",
              "observacion": "Valor ilustrativo",
              "decision": "RECIBIR",
              "estado": "GESTIONADA",
              "created_at": "2026-10-10T14:00:00.000Z",
              "updated_at": "2026-10-10T15:00:00.000Z",
              "recepcionId": "uuid-recepcion",
              "detalleRecepcionId": "uuid-detalle"
            }
          ],
          "vehiculos": [
            {
              "id": "uuid",
              "recepcion_id": "uuid-recepcion",
              "vehiculo_id": "uuid-vehiculo",
              "placa_snapshot": "ABC123",
              "tipo_vehiculo_snapshot": "Furgón",
              "marca_snapshot": "Marca ilustrativa",
              "modelo_snapshot": "Modelo ilustrativo",
              "temperatura": "3.00",
              "precinto": "PREC-01",
              "guia_transporte": "GUIA-01",
              "hora": "09:00:00",
              "vehiculo_conductor_ok": true,
              "created_at": "2026-10-10T14:00:00.000Z",
              "updated_at": "2026-10-10T14:00:00.000Z",
              "recepcionId": "uuid-recepcion"
            }
          ]
        }
      ]
    },
    "procesoProduccion": {
      "modalidad": "CONVENCIONAL",
      "reportesParciales": [
        {
          "id": "uuid-reporte",
          "fecha": "2026-10-17T16:00:00.000Z",
          "cantidad": 40,
          "lote": "LOTE-000123",
          "productoId": "uuid-pt",
          "productoCodigo": "PT-001",
          "productoNombre": "Producto terminado ilustrativo",
          "unidad": "kg",
          "movimientoSalidaId": "uuid-salida-pep",
          "movimientoEntradaId": "uuid-entrada-pt",
          "usuarioId": "uuid",
          "usuarioNombre": "Operador ilustrativo",
          "usuarioCorreo": "operador@example.test",
          "responsable": { "id": "uuid", "nombre": "Operador ilustrativo", "correo": "operador@example.test" }
        }
      ],
      "mermas": [
        {
          "id": "uuid-merma",
          "tipoMerma": "MP",
          "productoId": "uuid-mp",
          "productoCodigo": "MP-001",
          "productoNombre": "Materia prima ilustrativa",
          "cantidad": 1.2,
          "unidadMedidaId": "uuid-unidad",
          "unidad": "kg",
          "motivoCodigo": "PROCESO",
          "motivoNombre": "Motivo registrado",
          "observacion": "Observación registrada",
          "fecha": "2026-10-17T16:30:00.000Z",
          "usuarioId": "uuid",
          "usuarioNombre": "Usuario ilustrativo",
          "usuarioCorreo": "usuario@example.test",
          "responsable": { "id": "uuid", "nombre": "Usuario ilustrativo", "correo": "usuario@example.test" }
        }
      ]
    },
    "calidad": {
      "resumen": { "conformes": 0, "noConformes": 1, "pendientes": 0, "sinInformacion": 0 },
      "inspecciones": [
        {
          "id": "uuid-inspeccion",
          "estado": "CERRADA",
          "fechaInspeccion": "2026-10-17",
          "fechaInicio": "2026-10-17T13:00:00.000Z",
          "fechaCompletada": "2026-10-17T17:00:00.000Z",
          "fechaCierre": "2026-10-17T17:30:00.000Z",
          "observaciones": null,
          "productoId": "uuid-pt",
          "productoCodigo": "PT-001",
          "productoNombre": "Producto terminado ilustrativo",
          "lote": "LOTE-000123",
          "fechaVencimiento": "2027-01-17",
          "formatoId": "uuid-formato",
          "formatoCodigo": "CTRL-PROD",
          "formatoNombre": "Control de producción",
          "versionFormatoId": "uuid-version",
          "numeroVersion": 1,
          "tipoInspeccionCodigo": "PRODUCCION",
          "tipoInspeccionNombre": "Producción",
          "iniciadaPorId": "uuid",
          "iniciadaPorNombre": "Inspector ilustrativo",
          "iniciadaPorCorreo": "inspector@example.test",
          "cerradaPorId": "uuid",
          "cerradaPorNombre": "Inspector ilustrativo",
          "cerradaPorCorreo": "inspector@example.test",
          "iniciadaPor": { "id": "uuid", "nombre": "Inspector ilustrativo", "correo": "inspector@example.test" },
          "cerradaPor": { "id": "uuid", "nombre": "Inspector ilustrativo", "correo": "inspector@example.test" },
          "resultadoConsolidado": "NO_CUMPLE",
          "respuestas": [
            {
              "id": "uuid-respuesta",
              "inspeccion_id": "uuid-inspeccion",
              "campo_formato_id": "uuid-campo",
              "valor_texto": null,
              "valor_numero": "7.10",
              "valor_booleano": null,
              "valor_fecha": null,
              "valor_hora": null,
              "valor_fecha_hora": null,
              "valor_json": null,
              "observacion": "Observación registrada",
              "guardado_por": "uuid",
              "fecha_guardado": "2026-10-17T16:00:00.000Z",
              "bloqueada": true,
              "created_at": "2026-10-17T16:00:00.000Z",
              "updated_at": "2026-10-17T16:00:00.000Z",
              "inspeccionId": "uuid-inspeccion",
              "campoCodigo": "PH",
              "parametro": "pH",
              "criterioMinimo": 5.5,
              "criterioMaximo": 6.5,
              "unidad": "pH",
              "tipoCampo": "NUMERO",
              "guardadoPorId": "uuid",
              "guardadoPorNombre": "Inspector ilustrativo",
              "guardadoPorCorreo": "inspector@example.test",
              "guardadoPor": { "id": "uuid", "nombre": "Inspector ilustrativo", "correo": "inspector@example.test" }
            }
          ],
          "checklists": [
            {
              "id": "uuid-respuesta-checklist",
              "inspeccion_id": "uuid-inspeccion",
              "checklist_seccion_id": "uuid-seccion",
              "elemento_checklist_id": "uuid-elemento-checklist",
              "elemento_inspeccion_id": "uuid-elemento",
              "criterio_inspeccion_id": "uuid-criterio",
              "resultado": "NO",
              "cumple": false,
              "observacion": "Observación registrada",
              "evidencia_url": "/ruta/registrada",
              "guardado_por": "uuid",
              "fecha_guardado": "2026-10-17T16:00:00.000Z",
              "created_at": "2026-10-17T16:00:00.000Z",
              "updated_at": "2026-10-17T16:00:00.000Z",
              "inspeccionId": "uuid-inspeccion",
              "elementoCodigo": "EMP-01",
              "elemento": "Empaque",
              "criterioCodigo": "SIN-DANO",
              "criterio": "Sin daño",
              "pregunta": "¿El empaque está sin daño?",
              "resultadoEsperado": "SI",
              "guardadoPorId": "uuid",
              "guardadoPorNombre": "Inspector ilustrativo",
              "guardadoPorCorreo": "inspector@example.test",
              "guardadoPor": { "id": "uuid", "nombre": "Inspector ilustrativo", "correo": "inspector@example.test" }
            }
          ],
          "desviaciones": [
            {
              "id": "uuid-desviacion",
              "inspeccion_id": "uuid-inspeccion",
              "respuesta_inspeccion_id": "uuid-respuesta",
              "respuesta_elemento_checklist_id": null,
              "regla_calidad_id": "uuid-regla",
              "nivel_severidad_id": "uuid-severidad",
              "descripcion": "Desviación registrada",
              "mensaje": "Resultado fuera del criterio",
              "estado": "EN_TRATAMIENTO",
              "fecha_deteccion": "2026-10-17T16:00:00.000Z",
              "detectada_por": "uuid",
              "fecha_cierre": null,
              "cerrada_por": null,
              "created_at": "2026-10-17T16:00:00.000Z",
              "updated_at": "2026-10-17T16:00:00.000Z",
              "inspeccionId": "uuid-inspeccion",
              "severidadCodigo": "ALTA",
              "severidadNombre": "Alta",
              "detectadaPorId": "uuid",
              "detectadaPorNombre": "Inspector ilustrativo",
              "detectadaPorCorreo": "inspector@example.test",
              "detectadaPor": { "id": "uuid", "nombre": "Inspector ilustrativo", "correo": "inspector@example.test" },
              "accionesCorrectivas": [
                {
                  "id": "uuid-accion",
                  "desviacion_id": "uuid-desviacion",
                  "tipo_accion_id": "uuid-tipo",
                  "descripcion": "Acción registrada",
                  "estado": "EN_PROCESO",
                  "responsable_id": "uuid",
                  "fecha_asignacion": "2026-10-17T16:10:00.000Z",
                  "fecha_limite": "2026-10-20T23:59:59.000Z",
                  "fecha_inicio": "2026-10-17T16:20:00.000Z",
                  "fecha_envio_aprobacion": null,
                  "enviada_aprobacion_por": null,
                  "fecha_cierre": null,
                  "cerrada_por": null,
                  "observacion_cierre": null,
                  "created_at": "2026-10-17T16:10:00.000Z",
                  "updated_at": "2026-10-17T16:20:00.000Z",
                  "desviacionId": "uuid-desviacion",
                  "tipoAccionCodigo": "CORREGIR",
                  "tipoAccionNombre": "Corregir",
                  "responsableUsuarioId": "uuid",
                  "responsableNombre": "Responsable ilustrativo",
                  "responsableCorreo": "responsable@example.test",
                  "responsable": { "id": "uuid", "nombre": "Responsable ilustrativo", "correo": "responsable@example.test" },
                  "tarea": {
                    "id": "uuid-tarea",
                    "accion_correctiva_id": "uuid-accion",
                    "usuario_asignado_id": "uuid",
                    "fecha_limite": "2026-10-20",
                    "descripcion": "Tarea registrada",
                    "documentacion": null,
                    "estado": "PENDIENTE",
                    "fecha_completada": null,
                    "created_at": "2026-10-17T16:10:00.000Z",
                    "updated_at": "2026-10-17T16:10:00.000Z",
                    "accionCorrectivaId": "uuid-accion",
                    "asignadoId": "uuid",
                    "asignadoNombre": "Responsable ilustrativo",
                    "asignadoCorreo": "responsable@example.test"
                  },
                  "seguimientos": [
                    {
                      "id": "uuid-seguimiento",
                      "accion_correctiva_id": "uuid-accion",
                      "tipo_registro": "VERIFICACION",
                      "descripcion": "Seguimiento registrado",
                      "valor_numero": "6.20",
                      "valor_texto": null,
                      "valor_booleano": null,
                      "unidad_medida_id": "uuid-unidad",
                      "resultado_cumple": true,
                      "registrado_por": "uuid",
                      "fecha_registro": "2026-10-18T14:00:00.000Z",
                      "created_at": "2026-10-18T14:00:00.000Z",
                      "updated_at": "2026-10-18T14:00:00.000Z",
                      "accionCorrectivaId": "uuid-accion",
                      "unidad": "pH",
                      "registradoPorId": "uuid",
                      "registradoPorNombre": "Inspector ilustrativo",
                      "registradoPorCorreo": "inspector@example.test"
                    }
                  ],
                  "evidencias": [
                    {
                      "id": "uuid-evidencia",
                      "accion_correctiva_id": "uuid-accion",
                      "seguimiento_accion_correctiva_id": "uuid-seguimiento",
                      "tarea_accion_correctiva_id": null,
                      "nombre_archivo": "evidencia.pdf",
                      "tipo_archivo": "application/pdf",
                      "url_archivo": "/ruta/registrada/evidencia.pdf",
                      "descripcion": "Evidencia registrada",
                      "subido_por": "uuid",
                      "fecha_carga": "2026-10-18T14:10:00.000Z",
                      "created_at": "2026-10-18T14:10:00.000Z",
                      "updated_at": "2026-10-18T14:10:00.000Z",
                      "accionCorrectivaId": "uuid-accion",
                      "seguimientoId": "uuid-seguimiento",
                      "tareaId": null,
                      "subidoPorId": "uuid",
                      "subidoPorNombre": "Inspector ilustrativo",
                      "subidoPorCorreo": "inspector@example.test"
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    "movimientosProductoTerminado": [
      {
        "id": "uuid-movimiento",
        "tipoDocumento": "EN",
        "numeroDocumento": "EN-PT-000123",
        "fecha": "2026-10-17T18:00:00.000Z",
        "estado": "APLICADO",
        "origen": "OT",
        "origenId": "uuid-orden",
        "bodegaId": "uuid-bodega",
        "bodega": "Producto terminado",
        "detalleMovimientoId": "uuid-detalle",
        "cantidad": 96.5,
        "unidad": "kg",
        "sentido": "ENTRADA",
        "fechaVencimiento": "2027-01-17"
      }
    ],
    "trazabilidadHaciaAdelante": {
      "cantidadEntregada": 30,
      "unidad": "kg",
      "entregas": [
        {
          "movimientoId": "uuid-movimiento-salida",
          "operacionId": null,
          "tipoDocumento": "SA",
          "numeroDocumento": "SA-000200",
          "fecha": "2026-10-20T14:00:00.000Z",
          "estado": "APLICADO",
          "origen": "PEDIDO_VENTA",
          "origenId": "uuid-despacho",
          "observaciones": "Despacho del pedido PED-000010",
          "bodegaId": "uuid-bodega",
          "bodegaCodigo": "PT",
          "bodegaNombre": "Producto terminado",
          "detalleMovimientoId": "uuid-detalle",
          "cantidad": 30,
          "sentido": "SALIDA",
          "unidadMedidaId": "uuid-unidad",
          "unidad": "kg",
          "lote": "LOTE-000123",
          "fechaVencimiento": "2027-01-17",
          "responsableId": "uuid-usuario",
          "responsableNombre": "Usuario de despacho",
          "responsableCorreo": "despacho@example.test",
          "pedidoId": "uuid-pedido",
          "pedidoNumero": "PED-000010",
          "pedidoFecha": "2026-10-20T13:00:00.000Z",
          "pedidoObservaciones": null,
          "clienteId": "uuid-cliente",
          "clienteTipoDocumento": "NIT",
          "clienteNumeroDocumento": "900000001",
          "clienteRazonSocial": "Cliente ilustrativo SAS",
          "clienteNombreComercial": "Cliente ilustrativo",
          "clienteDireccionRegistrada": "Dirección registrada",
          "clienteCiudadRegistrada": "Ciudad registrada",
          "bodegaDestinoId": null,
          "bodegaDestinoCodigo": null,
          "bodegaDestinoNombre": null,
          "clasificacion": "ENTREGA_CLIENTE",
          "responsable": { "id": "uuid-usuario", "nombre": "Usuario de despacho", "correo": "despacho@example.test" },
          "cliente": {
            "id": "uuid-cliente",
            "tipoDocumento": "NIT",
            "numeroDocumento": "900000001",
            "razonSocial": "Cliente ilustrativo SAS",
            "nombreComercial": "Cliente ilustrativo",
            "direccionRegistrada": "Dirección registrada",
            "ciudadRegistrada": "Ciudad registrada"
          },
          "destinoRegistrado": {
            "tipo": "DOMICILIO_CLIENTE",
            "direccion": "Dirección registrada",
            "ciudad": "Ciudad registrada",
            "esDireccionEntregaConfirmada": false
          }
        }
      ],
      "trasladosInternos": [],
      "otrosMovimientos": [],
      "existenciasPorBodega": [
        {
          "bodegaId": "uuid-bodega",
          "bodegaCodigo": "PT",
          "bodegaNombre": "Producto terminado",
          "unidadMedidaId": "uuid-unidad",
          "unidad": "kg",
          "cantidadRestante": 66.5
        }
      ],
      "cantidadRestanteTotal": 66.5,
      "devolucionesCliente": [],
      "devolucionesClienteSoportadas": false
    }
  }
}
```

## Ejemplo completo de trazabilidad inversa

Los valores también son ilustrativos:

```json
{
  "success": true,
  "message": "Informe de trazabilidad inversa",
  "data": {
    "metadata": {
      "generadoEn": "2026-10-18T15:00:00.000Z",
      "soloLectura": true,
      "criterioLoteInventario": "COALESCE(lote,loteProveedor)",
      "devolucionesClienteSoportadas": false,
      "advertencias": []
    },
    "materiaPrima": {
      "id": "uuid-mp",
      "codigo": "MP-001",
      "nombre": "Materia prima ilustrativa",
      "descripcion": null,
      "tipoProducto": "MP",
      "unidadMedidaId": "uuid-unidad",
      "unidadCodigo": "KG",
      "unidadNombre": "Kilogramo",
      "unidadSimbolo": "kg",
      "lote": "LOTE-MP-001",
      "fechaVencimiento": "2026-12-31"
    },
    "recepciones": [
      {
        "detalleRecepcionId": "uuid-detalle",
        "cantidadRecibida": 100,
        "fechaVencimiento": "2026-12-31",
        "recepcionId": "uuid-recepcion",
        "recepcionNumero": "REC-000100",
        "fechaRecepcion": "2026-10-01T14:00:00.000Z",
        "recepcionEstado": "TERMINADA",
        "tieneNovedades": false,
        "proveedorId": "uuid-proveedor",
        "proveedorDocumento": "900000000",
        "proveedorRazonSocial": "Proveedor ilustrativo SAS",
        "proveedorNombreComercial": null,
        "movimientoEntradaId": "uuid-movimiento",
        "movimientoEntradaNumero": "EN-000100"
      }
    ],
    "produccionAfectada": [
      {
        "resultadoProduccionId": "uuid-resultado",
        "ordenProduccionId": "uuid-orden",
        "ordenNumero": "OT-000100",
        "ordenEstado": "FINALIZADA",
        "fechaInicio": "2026-10-10T12:00:00.000Z",
        "fechaFinalizacion": "2026-10-10T18:00:00.000Z",
        "productoTerminadoId": "uuid-pt",
        "productoTerminadoCodigo": "PT-001",
        "productoTerminadoNombre": "Producto terminado ilustrativo",
        "loteProductoTerminado": "LOTE-PT-001",
        "cantidadProducida": 90,
        "vencimientoProductoTerminado": "2027-01-10",
        "unidadConsumo": "kg",
        "unidadProductoTerminado": "kg",
        "cantidadMateriaPrimaConsumida": 20,
        "consumos": [
          {
            "detalleMovimientoId": "uuid-detalle-movimiento",
            "movimientoId": "uuid-movimiento",
            "movimientoNumero": "SA-000100",
            "fechaConsumo": "2026-10-10T13:00:00.000Z",
            "origen": "OT",
            "origenId": "uuid-orden",
            "cantidad": 20,
            "fechaVencimiento": "2026-12-31"
          }
        ]
      }
    ],
    "distribucionAfectada": [
      {
        "resultadoProduccionId": "uuid-resultado",
        "productoTerminadoId": "uuid-pt",
        "loteProductoTerminado": "LOTE-PT-001",
        "cantidadEntregada": 30,
        "cantidadRestanteTotal": 60,
        "entregas": [
          {
            "movimientoId": "uuid-salida",
            "tipoDocumento": "SA",
            "numeroDocumento": "SA-000200",
            "fecha": "2026-10-12T14:00:00.000Z",
            "cantidad": 30,
            "unidad": "kg",
            "clasificacion": "ENTREGA_CLIENTE",
            "pedidoId": "uuid-pedido",
            "pedidoNumero": "PED-000010",
            "cliente": {
              "id": "uuid-cliente",
              "tipoDocumento": "NIT",
              "numeroDocumento": "900000001",
              "razonSocial": "Cliente ilustrativo SAS",
              "nombreComercial": null,
              "direccionRegistrada": "Dirección registrada",
              "ciudadRegistrada": "Ciudad registrada"
            },
            "destinoRegistrado": {
              "tipo": "DOMICILIO_CLIENTE",
              "direccion": "Dirección registrada",
              "ciudad": "Ciudad registrada",
              "esDireccionEntregaConfirmada": false
            }
          }
        ]
      }
    ]
  }
}
```

## Funcionalidades no soportadas por el modelo actual

- No existe devolución comercial de producto terminado ni vínculo entre una entrada de devolución
  y el pedido/cliente/lote original. La devolución de OT existente es únicamente devolución interna
  de materias primas desde PEP.
- El pedido almacena el cliente, pero no una dirección de entrega, destinatario, transportador,
  guía de despacho o constancia de entrega independientes. `destinoRegistrado` usa únicamente el
  domicilio maestro del cliente y declara `esDireccionEntregaConfirmada: false`.
- No existe una entidad de retirada/recall, notificación a clientes o confirmación de inmovilización.

Para soportar devoluciones comerciales se necesitarían, previa autorización, entidades de cabecera
y detalle de devolución con pedido/despacho original, cliente, producto, lote, vencimiento,
cantidad, motivo, estado, responsable y movimientos de inventario asociados. Para destinos reales
se necesitaría guardar un snapshot de dirección/destinatario/guía al confirmar cada despacho.

`estadoVinculo` tiene tres valores:

- `UNICO`: una sola recepción terminada coincide por producto, lote y vencimiento.
- `AMBIGUO`: varias recepciones coinciden; se devuelven todas y no se adjudica una arbitrariamente.
- `NO_ENCONTRADO`: el consumo es real, pero no se demostró una recepción de origen.

`resultadoConsolidado` tiene `CUMPLE`, `NO_CUMPLE` o `PENDIENTE`. La ausencia de
inspecciones se representa con `calidad.resumen.sinInformacion = 1`, nunca como aprobación.

## Errores

Lote inexistente (`404`):

```json
{ "success": false, "message": "Lote de producto terminado no encontrado", "errors": null }
```

Lote ambiguo sin filtros (`409`):

```json
{
  "success": false,
  "message": "El lote coincide con más de un producto u orden; especifique productoId u ordenProduccionId",
  "errors": {
    "coincidencias": [
      { "ordenProduccionId": "uuid", "ordenNumero": "OT-1", "productoId": "uuid", "productoCodigo": "PT-1" }
    ]
  }
}
```

Parámetro inválido (`422`):

```json
{
  "success": false,
  "message": "Errores de validación",
  "errors": [
    { "type": "field", "value": "no-es-uuid", "msg": "Invalid value", "path": "productoId", "location": "query" }
  ]
}
```

Sin token (`401`):

```json
{ "success": false, "message": "Token no proporcionado", "errors": null }
```

Sin permiso (`403`):

```json
{ "success": false, "message": "No tienes permisos para realizar esta acción", "errors": null }
```

Los datos faltantes dentro de un expediente válido no producen error: se representan con `null`,
arreglos vacíos y mensajes en `metadata.advertencias`.
