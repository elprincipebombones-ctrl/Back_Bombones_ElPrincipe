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

## 5. Conteos: Guardar aplica directamente

Eliminar Guardar borrador, la pantalla de revisión y el botón separado Aplicar. Capturar productos en modal; Enter agrega una línea y no envía el conteo. Una bodega por conteo, máximo 500 líneas, cantidades no negativas con hasta 3 decimales.

Al pulsar Guardar, enviar una única petición POST /api/inventario/conteos con:

- idempotencia: UUID requerido, generado por el cliente para esa solicitud.
- bodegaId: UUID requerido.
- nota: texto obligatorio de 1 a 2000 caracteres.
- detalles: productoId, cantidadContada, lote/fechaVencimiento si corresponden; cantidadSistema opcional con el disponible que se mostró al usuario.

El backend siempre calcula el saldo real bajo bloqueo. cantidadSistema sólo permite detectar una vista desactualizada: si difiere, devuelve 409 sin guardar ni ajustar. Enviar este campo cuando se disponga del saldo; nunca enviar null ni usar cero por defecto para un saldo desconocido.

Requiere Inventario.Ver + Inventario.Contar + Inventario.Ajustar. Mostrar éxito sólo al recibir data.estado=APLICADO. La respuesta contiene detalles con cantidadSistema, cantidadContada y cantidad (diferencia), y documentos generados. Una diferencia positiva genera AJN; negativa AJS por valor absoluto; cero no genera documento. Un conteo mixto genera hasta un documento de cada sentido, con número propio y la nota.

Todo se confirma en una transacción. Un fallo no deja un borrador persistente ni ajustes parciales. Deshabilitar Guardar mientras se procesa. Conservar UUID y body exacto ante timeout/reintento; después del éxito cerrar o limpiar el formulario. Una nueva operación utiliza otro UUID. Reutilizar una clave con otro body o usuario devuelve 409.

GET /api/inventario/conteos y GET /api/inventario/conteos/:id conservan consultas y auditoría. Los nuevos conteos quedan APLICADO y no se editan ni anulan. PUT /api/inventario/conteos/:id sólo sirve para finalizar borradores históricos: exige el mismo contrato y guarda/aplica en una transacción. Las rutas antiguas aplicar/anular se conservan únicamente para documentos históricos; no usarlas en el flujo nuevo.

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

El backend valida existencias de la suma de **todos los destinos** por producto/unidad/lote/vencimiento. Stock insuficiente devuelve 409, sin documentos. Si es válido, aplica una TRS de origen y una TRN por destino, todos vinculados a operacionId y origen TRASLADO, conservando lote/vencimiento. Un fallo revierte toda la operación. No implementar descuentos y entradas separados en frontend. Mostrar documentos y refrescar existencias.

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

## Tipos de documento almacenados

AJN = Entrada por ajuste; AJS = Salida por ajuste; TRN = Entrada por traslado; TRS = Salida por traslado. Mostrar el código real que devuelve tipoDocumento junto con su descripción; no mapear artificialmente EN/SA. Recepciones conservan EN. La migración reclasifica los antiguos EN/SA de origen AJUSTE_CONTEO o TRASLADO sin cambiar sus números históricos; los nuevos números usan AJN-INV-, AJS-INV-, TRN-INV- o TRS-INV-.
