# Matriz de cobertura del Motor de Calidad

| Tabla | Modelo | Controller/agregado | Ruta/operación | Validator | Cobertura |
|---|---|---|---|---|---|
| `tipos_inspeccion` | `TipoInspeccion` | `tipo-inspeccion.controller` | `/api/calidad/tipos-inspeccion` | `catalogos.validator` | CRUD + baja lógica |
| `unidades_medida` | `UnidadMedida` | `unidad-medida.controller` | `/api/calidad/unidades-medida` | `catalogos.validator` | CRUD + baja lógica |
| `parametros_calidad` | `ParametroCalidad` | `parametro-calidad.controller` | `/api/calidad/parametros` | `catalogos.validator` | CRUD de medición reutilizable + reglas anidadas |
| `tipos_campo` | `TipoCampo` | `tipo-campo.controller` | `/api/calidad/tipos-campo` | `catalogos.validator` | CRUD + baja lógica |
| `niveles_severidad` | `NivelSeveridad` | `nivel-severidad.controller` | `/api/calidad/niveles-severidad` | `catalogos.validator` | CRUD + baja lógica |
| `tipos_accion` | `TipoAccion` | `tipo-accion.controller` | `/api/calidad/tipos-accion` | `catalogos.validator` | CRUD + baja lógica |
| `lugares_inspeccion` | `LugarInspeccion` | `lugar-inspeccion.controller` | `/api/calidad/lugares-inspeccion` | `catalogos.validator` | CRUD + baja lógica |
| `formatos_calidad` | `FormatoCalidad` | `formato-calidad.controller` | `/api/calidad/formatos` | `configuracion.validator` | CRUD + baja lógica |
| `versiones_formato` | `VersionFormato` | `version-formato.controller` | `/api/calidad/versiones-formato` | `configuracion.validator` | CRUD y consulta completa |
| `secciones_formato` | `SeccionFormato` | `seccion-formato.controller` | `/api/calidad/secciones-formato` | `configuracion.validator` | CRUD + baja lógica |
| `campos_formato` | `CampoFormato` | `campo-formato.controller` | `/api/calidad/campos-formato` | `configuracion.validator` | Selección de parámetro + herencia y overrides del formato |
| `opciones_campo` | `OpcionCampo` | `opcion-campo.controller` | `/api/calidad/opciones-campo` | `configuracion.validator` | CRUD + baja lógica |
| `reglas_calidad` | `ReglaCalidad` | `regla-calidad.controller` | `/api/reglas/reglas-calidad` | `reglas.validator` | CRUD por `parametro_calidad_id`; campo legado nullable |
| `condiciones_regla` | `CondicionRegla` | `condicion-regla.controller` | `/api/reglas/condiciones-regla` | `reglas.validator` | CRUD + baja lógica |
| `acciones_regla` | `AccionRegla` | `accion-regla.controller` | `/api/reglas/acciones-regla` | `reglas.validator` | CRUD + baja lógica |
| `inspecciones` | `Inspeccion` | `inspeccion.controller` | `/api/calidad/inspecciones` | `ejecucion.validator` | Crear, listar, obtener, editar, completar y cerrar; sin DELETE |
| `respuestas_inspeccion` | `RespuestaInspeccion` | `respuesta-inspeccion.controller` | `/inspecciones/:id/respuestas` | `ejecucion.validator` | Upsert transaccional mientras está en borrador; sin DELETE |
| `respuestas_opciones` | `RespuestaOpcion` | Agregado de respuesta | `/inspecciones/:id/respuestas` | `ejecucion.validator` | Se administra dentro de la respuesta; sin CRUD independiente |
| `desviaciones` | `Desviacion` | `desviacion.controller` | `/api/calidad/desviaciones` | `ejecucion.validator` | Listar, obtener, editar tratamiento y cerrar; sin DELETE |
| `acciones_correctivas` | `AccionCorrectiva` | `accion-correctiva.controller` | `/api/calidad/acciones-correctivas` | `ejecucion.validator` | Listar, obtener, editar, iniciar y cerrar; sin DELETE |
| `seguimientos_accion_correctiva` | `SeguimientoAccionCorrectiva` | `seguimiento-accion-correctiva.controller` | `/acciones-correctivas/:id/seguimientos` | `ejecucion.validator` | Creación histórica; sin edición ni DELETE |
| `evidencias_accion_correctiva` | `EvidenciaAccionCorrectiva` | `evidencia-accion-correctiva.controller` | `/acciones-correctivas/:id/evidencias` | `ejecucion.validator` | Creación de metadatos; sin edición ni DELETE |

Las tablas operativas no exponen eliminación física para conservar trazabilidad. `respuestas_opciones` se considera parte de `RespuestaInspeccion` y se sincroniza dentro de la misma transacción.

Las reglas pertenecen al parámetro reutilizable. El evaluador recorre `campo_formato → parametro_calidad → reglas_calidad`; una regla activa con resultado `NO_CUMPLE` crea la desviación y sus acciones, mientras que `CUMPLE` confirma el rango sin crear desviaciones.
