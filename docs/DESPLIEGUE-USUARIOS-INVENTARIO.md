# Activación de usuarios e inventario

Se conserva login por usuario, correo repetible y cargo opcional. Se retiró tipoProducto del modelo/controlador de productos y su creación de la migración anterior. Los cambios del compañero no están integrados; capacidades.filtroTipoProducto=false informa al frontend y el filtro MP/PT devuelve 409.

## Migraciones

Actualización 2026-09-16: aplicada `20260916000001-tipos-documento-inventario.js` en la base configurada. Amplía tipo_documento a tres caracteres y permite AJN/AJS/TRN/TRS. Reclasifica los anteriores EN/SA de origen AJUSTE_CONTEO/TRASLADO, conservando números y recepciones. Los productos no se modifican.

POST /api/inventario/conteos ahora guarda y aplica en una transacción: requiere nota, UUID idempotencia y permisos Inventario.Contar e Inventario.Ajustar además de Inventario.Ver. Responde APLICADO con documentos AJN/AJS. Un reintento con el mismo UUID y contenido devuelve la operación existente. cantidadSistema es opcional como control de concurrencia: si se envía y difiere del saldo real, responde 409 sin registrar cambios.

No mostrar Guardar borrador, Revisión ni Aplicar en el flujo nuevo. Las referencias a borradores de este documento sólo corresponden a históricos. PUT guarda y aplica esos documentos. Los traslados nuevos generan TRS en origen y TRN por destino. Reiniciar el backend si no usa recarga automática y desplegar el frontend con el nuevo contrato antes de operar.

Verificación: 33 pruebas aprobadas, incluidas migración de tipos, conservación de documentos, guardado directo, idempotencia, rollback, kardex, exportaciones y recepciones. La suite se ejecuta secuencialmente para limitar el consumo de memoria.

- 20260914000001-usuarios-cargos-inventario.js: usuarios, cargos y sentido de detalles; ya no modifica productos en instalaciones nuevas.
- 20260915000001-inventario-fisico-traslados.js: operaciones/conteos, líneas, vínculo a documentos, secuencia, permisos y bloqueo de bodegas. Conserva productos.tipo_producto y sus valores: esta columna también fue creada por la migración independiente 20260913000002-add-tipo-producto.js. No debe eliminarse desde inventarios.

La migración de usuarios/cargos ya fue aplicada al crear la cuenta de prueba. Al diagnosticar el error 500 del kardex se confirmó que sigue pendiente 20260915000001-inventario-fisico-traslados.js: falta movimientos_inventario.operacion_id y no existen las tablas de operaciones. Su aplicación requiere autorización y respaldo previo; la revisión automática bloqueó aplicarla en esta sesión. Instalar con npm ci y revisar npx sequelize-cli db:migrate:status antes de aplicar migraciones. La migración histórica 20260903000001-refactor-recepcion-inventario.js contiene limpieza de datos operativos: no ejecutarla a ciegas si está pendiente en una base con datos.

Para consultar usuarios asignados: SELECT id, nombre, correo, usuario FROM usuarios ORDER BY nombre;
Las cuentas existentes reciben u_ seguido del UUID sin guiones, conservan contraseña y pueden editar su identificador. El seeder nuevo usa admin. No se ofrece rollback automático que restituya correo único o revierta documentos aplicados.

## Operación

- Conteos BORRADOR guardan saldo, cantidad contada, diferencia y huella de movimientos. Aplicar exige nota, stock sin cambios y productos/bodega activos. Positivos generan EN, negativos SA, cero no genera documento. Hasta un documento de cada sentido por conteo. Aplicados no se editan ni anulan.
- Cantidades calculadas en milésimas enteras; stock por producto/unidad/lote/vencimiento. Sin conversiones de unidades.
- Traslados desde una bodega a varios destinos: validación del total y aplicación transaccional. Idempotencia obligatoria para no duplicar reintentos.
- Bodegas bloqueadas en orden antes de validar stock. Triggers en movimientos/detalles hacen participar a recepciones y otros escritores. Deben permanecer activos; no usar escrituras que deshabiliten triggers ni TRUNCATE en movimientos operativos.
- AJ/TR históricos sin sentido bloquean operaciones del producto/unidad hasta revisar documentos originales. No se inventa su dirección. Consultas muestran saldo null si falta esa información.
- Kardex obligatorio por producto, fechas inclusivas Bogotá y bodega opcional. Saldo inicial y acumulados por bodega/unidad calculados antes de paginar.

Permisos: Inventario.Ver, Inventario.Contar, Inventario.Ajustar, Inventario.Trasladar. La migración los asigna al Administrador; configurar otros roles. Seeder actualizado para instalaciones nuevas.

La referencia visual no fue accesible y no había navegador conectado. El prompt especifica funciones, no una reproducción verificada del diseño.

## Verificación

npm run test:inventario prueba migraciones, conservación de la columna de productos y sus valores, cálculos SQL, notas, documentos EN/SA, reintentos, lotes, conteos obsoletos, rollback de traslados, kardex y exportaciones usando PostgreSQL embebido. npm run test:recepcion verifica el flujo existente. No escriben en la base configurada. La contención simultánea entre conexiones de producción no se ha ensayado en este entorno embebido.

Contrato y prompt: docs/PROMPT-FRONTEND-USUARIOS-INVENTARIO.md.
