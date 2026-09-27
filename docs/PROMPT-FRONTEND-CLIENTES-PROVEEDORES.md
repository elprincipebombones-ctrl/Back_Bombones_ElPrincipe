# Prompt para uniformar clientes y proveedores en Angular

Adapta el frontend Angular para consumir el backend unificado de terceros. El backend persiste clientes y proveedores en una sola tabla, pero conserva recursos REST separados. No mezcles las pantallas ni envíes los indicadores internos `esCliente` o `esProveedor`.

## Contrato común

Los endpoints son `/api/clientes` y `/api/proveedores`, con operaciones GET de lista/detalle, POST, PUT y DELETE. Todas requieren JWT Bearer. POST y PUT aceptan `multipart/form-data` y también `application/json` cuando no hay archivos.

Campos compartidos: `tipoDocumento`, `numeroDocumento`, `razonSocial` opcional, `nombreComercial` opcional, `telefono`, `nombreContactoTelefono`, `email`, `direccion`, `ciudad` y `estado`. La presentación debe usar `razonSocial ?? nombreComercial ?? numeroDocumento`.

Los archivos opcionales se llaman `camaraComercio` y `rut`; sólo PDF, JPEG o PNG, máximo 10 MB. Si no se adjunta un archivo durante PUT, el backend conserva el existente. No envíes valores vacíos simulando archivos.

Cada documento devuelto tiene `id`, `nombreOriginal`, `url`, `mimeType` y `tamano`. Descarga `url` como Blob mediante `HttpClient` agregando el Bearer; no uses directamente `window.open(url)`.

## Diferencias de clientes

En clientes, `emailFacturacionElectronica` es obligatorio, debe ser un email válido y no debe completarse automáticamente con `email`. Usa los permisos `Clientes.Ver`, `Clientes.Crear`, `Clientes.Editar` y `Clientes.Eliminar`.

## Diferencias de proveedores

En proveedores no se solicita ni se muestra `emailFacturacionElectronica`. Usa `Proveedores.Ver`, `Proveedores.Crear`, `Proveedores.Editar` y `Proveedores.Eliminar`.

## Comportamiento esperado

- Construye `FormData` solamente cuando haya archivos; agrega `estado` literalmente como `"true"` o `"false"`.
- Trata `razonSocial` como opcional y admite `null`.
- Cuando la misma identificación ya existe en el otro módulo, POST puede convertir el tercero existente para que cumpla ambos roles sin duplicarlo.
- Un duplicado dentro del mismo módulo responde 409.
- Muestra `error.error.message` para errores 404, 409 y 422.
- Respeta el wrapper `{ success, message, data }`.
- Al eliminar un cliente que también es proveedor, el backend sólo retira su rol de cliente; el proveedor permanece. Lo mismo aplica en sentido contrario.

Actualiza interfaces TypeScript, servicios HTTP, formularios reactivos, validadores, tablas, detalle, carga/reemplazo de documentos, guardas de permisos y pruebas. Mantén componentes compartidos para los campos comunes, pero formularios contenedores separados para clientes y proveedores.
