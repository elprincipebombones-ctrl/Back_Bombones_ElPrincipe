# Prompt para el frontend

Implementa los siguientes cambios en el frontend existente, respetando sus componentes, navegación, estilos, manejo de sesión y cliente HTTP. El backend usa el prefijo `/api`, JWT Bearer y respuestas JSON `{ success, message, data }`; los errores usan `{ success: false, message, errors }`. Los IDs son UUID.

## 1. Autenticación y usuarios

- Cambia el formulario de login de correo a **Usuario**. Envía `POST /api/auth/login` con `{ "usuario": "operador.1", "password": "..." }`. No envíes correo como credencial.
- Usuario: 3–100 caracteres, letras a-z, números, punto, guion y guion bajo. Se normaliza a minúsculas y se quitan espacios exteriores. Es único. `nombre` sigue siendo el nombre de la persona y `correo` un dato de contacto que se puede repetir.
- Login responde `data: { token, refreshToken, usuario: { id, nombre, usuario, correo, estado, cargoId, cargo }, rol, permisos, menus }`. `cargo` es un objeto del maestro o null. `GET /api/auth/perfil` devuelve la misma estructura sin tokens. Refresh continúa en `POST /api/auth/refresh` con `{ refreshToken }`.
- En listar/crear/editar usuarios agrega usuario y cargo. `POST /api/usuarios` requiere `{ nombre, usuario, correo, password, rolId }` y acepta `cargoId` UUID o null. `PUT /api/usuarios/:id` permite modificar esos campos y `estado`; omitir password si no cambia y enviar `cargoId: null` para retirar cargo. No impedir correos duplicados. Un usuario duplicado devuelve 409.
- La contraseña de creación requiere mínimo 8 caracteres, mayúscula, minúscula y número.
- Muestra rol y cargo como campos independientes: el rol determina permisos, el cargo es el puesto laboral. Un cargo no concede acceso.

## 2. Maestro de cargos

- Ruta frontend `/cargos`, con listado, búsqueda local, crear, editar e inactivar. Campos: `nombre` obligatorio (2–100), `descripcion` opcional (hasta 255), `estado` booleano.
- API: `GET /api/cargos`, `GET /api/cargos/:id`, `POST /api/cargos`, `PUT /api/cargos/:id`, `DELETE /api/cargos/:id`.
- Crear/editar envían `{ nombre, descripcion, estado }`; listar devuelve un array dentro de `data`. Un cargo asignado no se elimina: devuelve 409; ofrecer inactivarlo. Los cargos inactivos permanecen visibles en usuarios existentes y no deben ofrecerse para nuevas asignaciones.
- Permisos del maestro: `Cargos.Ver`, `Cargos.Crear`, `Cargos.Editar`, `Cargos.Eliminar`. El listado también permite `Usuarios.Ver`, `Usuarios.Crear` o `Usuarios.Editar` para poblar el selector.

## 3. Reversión de productos

Revertir el selector tipoProducto y demás modificaciones del prompt anterior al maestro de productos. Los cambios del compañero aún no están en este checkout. No crear otra clasificación ni inferir MP/PT por nombre, categoría o bodega.

`GET /api/inventario/catalogos` responde `data: { productos, bodegas, categorias, unidades, capacidades: { filtroTipoProducto: false } }`. Mostrar todos los productos y deshabilitar el filtro MP/PT con “Pendiente de integración del maestro”. Enviar tipoProducto a existencias/informes devuelve 409. Conectar ese filtro cuando esté disponible el maestro del compañero.

## 4. Inventarios: visualizador

Ruta `/inventario`, permiso base `Inventario.Ver`, pestañas **Existencias**, **Conteos físicos**, **Traslados**, **Kardex** e **Informes**.

Referencia: `https://web.laminaire.net/SirWeb/SIR_Enterprise_WEB/TarjetasComExt`. No fue posible inspeccionarla en esta sesión. Usar los componentes del proyecto para un visualizador con filtros y tabla de productos/existencias; ajustar la apariencia exacta cuando haya una captura. No afirmar que el diseño ya fue replicado.

Catálogos: `/api/inventario/catalogos` incluye todas las bodegas, incluso inactivas. Mostrar todas al consultar; al capturar operaciones sólo permitir bodegas y productos activos. Productos incluyen `id,codigo,nombre,categoriaProductoId,unidadMedidaId,estado`.

`GET /api/inventario/existencias`: filtros opcionales `bodegaId,productoId,categoriaProductoId,codigo,pagina,limite`. Página desde 1, límite 1–200 (predeterminado 50). Respuesta `data: { filas,total,pagina,limite,metadata }`.

Fila: `productoId,codigo,nombre,descripcion,categoriaProductoId,bodegaId,bodega,bodegaActiva,productoActivo,unidadMedidaId,unidad,lote,fechaVencimiento,saldoConocido,movimientosSinSentido,inventarioDisponible`. Incluye productos/bodegas sin movimientos con cero. Cantidades como strings decimales para preservar precisión. Clave de fila: producto+bodega+unidad+lote+vencimiento.

Mostrar disponible, código, producto, bodega, unidad y lote/vencimiento. No sumar unidades o productos distintos. Disponible null significa historia pendiente de clasificar: no convertir a cero ni reemplazarlo por saldoConocido. Acciones “Contar” y “Kardex” precargan producto/bodega.

## 5. Conteos físicos y ajustes

Una bodega por conteo, hasta 500 líneas. Seleccionar producto, lote/vencimiento si corresponde y mostrar **Cantidad sistema**, **Cantidad contada**, **Ajuste = contada − sistema**. Cantidad contada permite cero, no negativos, máximo 12 enteros y 3 decimales. Unidad determinada por el producto, sin conversiones.

```text
GET  /api/inventario/conteos?bodegaId=UUID&estado=BORRADOR&pagina=1&limite=50
GET  /api/inventario/conteos/:id
POST /api/inventario/conteos
PUT  /api/inventario/conteos/:id
POST /api/inventario/conteos/:id/aplicar
POST /api/inventario/conteos/:id/anular
```

Crear/editar/anular borradores requiere `Inventario.Contar`, además de Ver. Body de crear y editar (PUT reemplaza las líneas completas):

```json
{
  "bodegaId": "UUID-BODEGA",
  "nota": "Conteo físico de cierre",
  "detalles": [
    { "productoId": "UUID-PRODUCTO", "cantidadContada": "12.500", "lote": "L001", "fechaVencimiento": "2027-01-31" }
  ]
}
```

Omitir lote/fecha o enviar null cuando no los requiera el producto. En productos con lotes, contar cada combinación lote/vencimiento por separado, sin lotes ficticios ni detalles repetidos. No cambiar la bodega de un conteo existente.

Respuesta: cabecera con `id,tipo,estado,bodegaId,usuarioId,nota,aplicadoPor,aplicadoEn,createdAt,updatedAt`, `bodega`, `detalles`, `documentos`. Cada detalle incluye `producto`, `productoId,unidadMedidaId,lote,fechaVencimiento,cantidadSistema,cantidadContada,cantidad` (diferencia firmada). El backend calcula sistema/diferencia; no enviar usuario, estado, huella o saldo como valores de autoridad. Mostrar las cifras devueltas para revisión.

La nota puede quedar vacía en borrador, pero es **obligatoria al aplicar**. Aplicar requiere `Inventario.Ajustar`: enviar `{ "nota": "Motivo del ajuste" }` o utilizar la nota guardada. Máximo 2.000 caracteres.

- Diferencia positiva: EN; negativa: SA por valor absoluto; cero: sin movimiento.
- Conteo mixto genera hasta dos documentos: un EN con los aumentos y un SA con las disminuciones. Ambos con número propio, misma bodega, nota obligatoria, `origen: AJUSTE_CONTEO` y `operacionId`.
- Aplicar devuelve `APLICADO` y documentos. Reintentar el mismo ID no duplica movimientos.
- Si cambia stock desde guardar, devuelve **409**. Recargar existencias, pedir revisar/recontar y guardar de nuevo. No recalcular silenciosamente ni reintentar ajustando valores.
- Sólo borradores se editan/anulan. Aplicados quedan de consulta; corregir con nuevo conteo. Anular borrador no mueve stock.
- Listados devuelven `{ filas,total,pagina,limite }`; estados BORRADOR/APLICADO/ANULADO. Mostrar auditoría, sin editarla.

## 6. Traslados

Una bodega origen y uno o varios destinos por operación. Mostrar total enviado por producto/lote. Origen y destino deben ser distintos y activos. Cantidades positivas, hasta 3 decimales. Permiso `Inventario.Trasladar` además de Ver.

```text
GET  /api/inventario/traslados?bodegaId=UUID&pagina=1&limite=50
GET  /api/inventario/traslados/:id
POST /api/inventario/traslados
```

El filtro bodegaId del listado es la bodega origen. Body:

```json
{
  "idempotencia": "UUID-GENERADO-POR-EL-CLIENTE",
  "bodegaId": "UUID-ORIGEN",
  "nota": "Reposición",
  "detalles": [
    { "productoId": "UUID-PRODUCTO", "bodegaDestinoId": "UUID-DESTINO-1", "cantidad": "4.000", "lote": "L001", "fechaVencimiento": "2027-01-31" },
    { "productoId": "UUID-PRODUCTO", "bodegaDestinoId": "UUID-DESTINO-2", "cantidad": "2.000", "lote": "L001", "fechaVencimiento": "2027-01-31" }
  ]
}
```

Generar UUID idempotencia y conservarlo con el mismo body al reintentar por timeout/red. Una nueva solicitud usa otro UUID. Reutilizar clave con contenido o usuario diferente devuelve 409. Deshabilitar enviar mientras se procesa.

El backend valida existencias de la suma de **todos los destinos** por producto/unidad/lote/vencimiento. Stock insuficiente devuelve 409, sin documentos. Si es válido, aplica una SA de origen y una EN por destino, todos vinculados a operacionId y origen TRASLADO, conservando lote/vencimiento. Un fallo revierte toda la operación. No implementar descuentos y entradas separados en frontend. Mostrar documentos y refrescar existencias.

## 7. Kardex

`GET /api/inventario/kardex?productoId=UUID&bodegaId=UUID&fechaDesde=2026-01-01&fechaHasta=2026-01-31&pagina=1&limite=50`.

**Producto obligatorio**, fechas obligatorias YYYY-MM-DD inclusivas, desde<=hasta. Bodega opcional: sin ella devuelve todas con saldos separados. No consultar antes de seleccionar producto. Reiniciar página al cambiar filtros.

Respuesta `data: { filas,total,pagina,limite,saldos,metadata }`.

- saldos: array `bodegaId,bodega,unidadMedidaId,unidad,saldoInicial,saldoFinal,entradas,salidas,movimientosSinSentido`. Saldo inicial incluye movimientos anteriores al rango. Puede haber saldos aunque no haya movimientos en el período.
- filas: `detalleId,movimientoInventarioId,operacionId,fecha,tipoDocumento,numeroDocumento,bodegaId,bodega,productoId,codigo,nombre,unidadMedidaId,unidad,lote,fechaVencimiento,origen,nota,cantidad,sentido,entradas,salidas,saldo`.
- Mostrar fecha, documento, bodega, lote, origen, nota, entradas, salidas y saldo acumulado por bodega/unidad. Cantidades principales como strings decimales, mostrar hasta 3 decimales. Null significa historia incompleta.
- Orden cronológico estable; el saldo ya incorpora filas de páginas anteriores. No calcularlo sumando la página visible. Sólo movimientos APLICADO. Fechas America/Bogota.
- Número de documento abre `/api/inventario/movimientos/:id`: cabecera, bodega y detalles con producto/unidad. Enlazar a conteo/traslado mediante operacionId según origen.

## 8. Informes y Excel/PDF

Conservar `/api/inventario/informes/control-estadistico` y `/api/inventario/informes/movimientos`, con fechaDesde/fechaHasta requeridas y filtros opcionales productoId,bodegaId,categoriaProductoId,codigo,pagina,limite. No enviar tipoProducto mientras esté pendiente el maestro. Respuesta `{ filas,total,pagina,limite,metadata }`.

Control estadístico muestra código, nombre/descripción, categoría, clasificación de categoría, unidad, frecuencia, inventarioDisponible, entradas, salidas, movimientoNeto, promedioMensual, stockSeguridad. tipoProducto es null por compatibilidad. Frecuencia cuenta movimientos distintos de salida; promedio mensual = salidas/(días inclusivos/30); seguridad = promedio/0,5. Disponible es saldo actual sin reservas, independiente del rango. Los nuevos ajustes y traslados cuentan en entradas/salidas. No confundir disponible actual con saldo final del kardex a la fecha seleccionada.

Ambos informes y kardex aceptan `formato=xlsx` o `formato=pdf` con los mismos filtros. Descargar Blob autenticado como inventario.xlsx/pdf; exporta todo el filtro, no sólo la página. Máximo 10.000 filas; 422 pide reducir filtros. Manejar errores JSON recibidos como Blob y liberar object URL. Excel del kardex incluye saldos iniciales/finales en Criterios.

## Criterios de aceptación

Verificar nota obligatoria, conteos positivos/negativos/cero, conflicto por stock cambiado, reintento sin duplicar, traslado cuyo total a varios destinos excede stock, lotes, rollback sin documentos parciales, todas las bodegas, producto obligatorio, saldo inicial fuera de rango, paginación de kardex y descargas autenticadas. Mantener login y cargos; revertir únicamente lo añadido al maestro de productos.
