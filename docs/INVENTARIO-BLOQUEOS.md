# Congelamiento de existencias de inventario

## Migración y modelo

Ejecute `npm run migrate` antes de desplegar. La migración
`20261017000001-inventario-bloqueos-lote.js` crea:

- `inventario_bloqueos_lote`, con historial de estados `CONGELADO` y `LIBERADO`.
- `inventario_eventos_auditoria`, para congelamientos, liberaciones e intentos de uso.
- Un índice único parcial que impide dos bloqueos activos para la misma combinación
  producto, bodega, unidad, lote y vencimiento. Los valores vacíos se normalizan a `null`.
- Índices de consulta y relaciones con usuarios, Calidad y maestros de inventario.

El bloqueo es total para la combinación exacta. No modifica movimientos ni saldos físicos.
Las fechas se generan en el servidor y se serializan como ISO 8601.

## Permisos

La migración crea y asigna inicialmente al rol `Administrador`:

- `Inventario.CongelarLote`
- `Inventario.LiberarLote`
- `Inventario.VerBloqueos`
- `Inventario.VerHistorialBloqueos`

Los demás roles deben recibirlos mediante la administración normal de roles. Todos los
endpoints conservan además la autorización base `Inventario.Ver` del módulo.

## Endpoints

Todos requieren JWT y viven bajo `/api/inventario/bloqueos`.

### Congelar

`POST /api/inventario/bloqueos`

```json
{
  "productoId": "uuid",
  "bodegaId": "uuid",
  "unidadMedidaId": "uuid",
  "lote": "LOTE-001",
  "fechaVencimiento": "2026-12-31",
  "motivo": "Pendiente de aprobación de Calidad",
  "origen": "CALIDAD",
  "inspeccionCalidadId": "uuid opcional",
  "accionCorrectivaId": "uuid opcional"
}
```

Responde `201`; `congeladoPorId` y `congeladoEn` siempre los determina el servidor.

### Liberar

`POST /api/inventario/bloqueos/:id/liberar`

```json
{ "nota": "Calidad aprobó nuevamente el uso." }
```

La nota es obligatoria. El registro histórico no se elimina.

### Consultas

- `GET /api/inventario/bloqueos`
- `GET /api/inventario/bloqueos/historial`
- `GET /api/inventario/bloqueos/:id`
- `GET /api/inventario/bloqueos/estado?productoId=...&bodegaId=...&unidadMedidaId=...&lote=...&fechaVencimiento=...`

Listado e historial admiten `productoId`, `bodegaId`, `lote`, `pagina` y `limite`.
El historial también admite `estado`, `fechaDesde` y `fechaHasta`.

## Contrato de existencias

`GET /api/inventario/existencias` mantiene sus campos y agrega por fila:

```json
{
  "inventarioFisico": "125.000",
  "cantidadCongelada": "125.000",
  "inventarioDisponible": "0.000",
  "estadoDisponibilidad": "CONGELADO",
  "bloqueoActivo": {
    "id": "uuid",
    "motivo": "Pendiente de aprobación de Calidad",
    "origen": "CALIDAD",
    "congeladoEn": "2026-10-17T23:23:00.000Z",
    "congeladoPor": { "id": "uuid", "nombre": "Usuario" }
  }
}
```

Los saldos indeterminados permanecen en `null`; nunca se sustituyen por cero.

## Operaciones protegidas

Se excluyen existencias congeladas de existencias disponibles, alertas operativas,
sugerencias FEFO, selección/reserva/despacho de pedidos y saldos de producción/PEP.
Además se revalida dentro de la transacción antes de traslados, ajustes negativos,
consumos de producción y salidas de ventas. Una selección manual congelada responde `409`:

```json
{
  "success": false,
  "message": "La existencia está congelada y no puede utilizarse.",
  "errors": {
    "codigo": "EXISTENCIA_CONGELADA",
    "bloqueoId": "uuid",
    "motivo": "Pendiente de aprobación de Calidad"
  }
}
```

Las operaciones y el congelamiento usan un bloqueo transaccional por clave exacta; el
índice parcial es la última garantía frente a solicitudes simultáneas.

## Cambios requeridos en el frontend

- Mostrar `inventarioFisico`, `inventarioDisponible`, `cantidadCongelada` y el estado.
- Deshabilitar acciones operativas cuando `estadoDisponibilidad` sea `CONGELADO`.
- Incorporar formularios de congelar/liberar con nota obligatoria y los permisos nuevos.
- Mostrar fechas ISO en `America/Bogota` sin alterar el valor recibido.
- Tratar `409 / EXISTENCIA_CONGELADA` como conflicto actualizado del servidor y refrescar
  existencias; el backend sigue siendo la autoridad aunque el cliente no deshabilite la acción.
