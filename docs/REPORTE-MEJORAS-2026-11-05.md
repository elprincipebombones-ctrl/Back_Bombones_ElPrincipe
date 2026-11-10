# Mejoras de consistencia — 5 de noviembre de 2026

## Cambios implementados

| Área | Resultado |
| --- | --- |
| Recepción | Cada producto guarda su bodega de destino. La bodega general es opcional y existe una acción explícita para asignarla a todos. Después pueden modificarse las asignaciones individuales. |
| Inventario | El cierre de recepción genera una entrada por bodega, solo con productos aceptados. Todas las entradas se confirman o revierten en una única transacción. Se validan destinos activos y se protege la repetición del cierre. |
| Históricos | La migración completa las bodegas de los detalles existentes usando su recepción. Conserva los códigos y los movimientos anteriores. |
| Trazabilidad | Los reportes utilizan la bodega del detalle y vinculan cada producto con la entrada de su destino, lote y vencimiento. |
| Códigos de calidad | Los catálogos mantienen códigos internos automáticos y ocultos. **Excepción desde el 10 de noviembre:** los formatos de calidad vuelven a mostrar un código manual y obligatorio. Los códigos históricos no se renumeran y los códigos semánticos existentes del motor de calidad permanecen intactos. |
| Lugares de inspección | La agrupación antes llamada “Categorías” se presenta como “Puntos de muestreo”. El panel dependiente indica “Lugares de inspección en [nombre]”. Se ajustan creación, edición, selección, búsquedas y mensajes vacíos. Las categorías de elementos de checklist conservan su significado. |
| Textos de calidad | Una función compartida traduce condiciones como `MAYOR_QUE` a texto legible, incluyendo escenarios, editor y acciones correctivas. Se corrigen títulos de formularios, mensajes y rangos sin configurar. |
| Aprobación | Los requisitos faltantes muestran una X; los completos mantienen su comprobación. |
| Gráficos | Las barras utilizan siete fechas reales con cantidades programadas y ejecutadas, en rojo y verde. El pastel representa cantidades reales por estado de acción correctiva; deja de usar inspecciones como acciones cerradas. Ambos muestran estados vacíos sin datos ficticios. El día operativo se calcula con la zona de Bogotá. |
| Campos de texto | Se normaliza la primera letra a mayúscula y las restantes a minúscula, incluyendo textos que comienzan con signos de interrogación. La normalización se aplica al salir del campo y en los textos naturales enviados por JSON al backend. Los registros históricos no se convierten masivamente. |
| Campos protegidos | Códigos, placas, usuarios, correos, contraseñas, lotes, símbolos, rutas, permisos, iconos, valores técnicos y búsquedas conservan su tratamiento específico. |
| Campos numéricos | Se ocultan las flechas de incremento y se evita que la rueda cambie el valor de un campo enfocado. Se conservan las validaciones y la entrada por teclado. El comportamiento compartido también cubre diálogos. |
| Presentación | Se unifica la fuente en Roboto y se aprovecha el marco compartido para anchos y márgenes de calidad e inicio. Se eliminan estilos obsoletos del marco del inicio que duplicaban la navegación compartida. |
| Estados | Se comparte una clasificación de verde, amarillo y rojo con etiquetas legibles en calidad, recepción, inventario, órdenes, control de producción, Salida PT y usuarios. El color acompaña el texto. |
| Existencias | Se verificó que el filtro y la columna del producto ya se denominaban “Producto”; se conservan. |
| Nueva orden | La modal para agregar un producto muestra su unidad de medida real junto a la cantidad. |
| Órdenes registradas | Se agregan filtros combinables por número, todos los estados, rango de fechas y producto, además de limpiar filtros. Filtrar un producto no recorta los detalles de las órdenes encontradas. |
| Salida PT | Se cambia el nombre visible del módulo completo en navegación, inicio y encabezado. Las rutas y permisos internos mantienen compatibilidad. |
| Maestros | Se retira el acceso a Lugares y áreas. Se comparten encabezados, filtros, tablas y formularios, y se ocultan los códigos internos de categorías de productos y bodegas. |
| Login adaptable | Se reorganizan el panel de marca y el formulario según el espacio disponible. Se eliminan el desplazamiento lateral fijo y la curva que deformaban la composición en tablet. Se mantienen el logo y los colores corporativos, con efectos decorativos contenidos en el panel. |

## Verificación

- Compilación de desarrollo y comprobación de TypeScript y plantillas Angular correctas.
- Compilación de producción correcta. Se mantienen avisos sobre el tamaño del estilo de Control de producción y la dependencia CommonJS de SweetAlert2.
- Frontend: **46 pruebas aprobadas en 14 archivos**, mediante `npm run test:mejoras`, incluyendo las verificaciones de login, Maestros, Roles, Lugares y código manual de formatos.
- Backend: **72 pruebas de regresión aprobadas** en recepción, inventario, órdenes, despachos y trazabilidad. Después se ejecutaron **39 pruebas aprobadas** de recepción, consistencia y trazabilidad con los casos adicionales. Estos conjuntos se superponen; no deben sumarse. En la ampliación de Maestros se ejecutaron **34 pruebas aprobadas**, incluyendo cuatro nuevas de códigos y migración, junto con recepción y consistencia.
- La migración y las consultas de los gráficos se verificaron en PostgreSQL embebido aislado (PGlite), sin modificar la base configurada del proyecto.
- Se probaron destinos múltiples, bodega faltante o inactiva, reversión al fallar la segunda entrada, cierre repetido, códigos históricos, asignación concurrente de consecutivos, filtros combinados y campos protegidos.
- ESLint sin errores en los archivos JavaScript afectados y revisión de diferencias sin errores de espacios.

## Aplicación de la migración

Antes de iniciar el backend actualizado, ejecutar en el repositorio del backend:

```powershell
npm run migrate
```

Las migraciones pendientes de esta mejora son `20261105000001-recepcion-bodegas-y-codigos-calidad.js` y `20261105000002-codigos-internos-maestros.js`. La segunda crea las secuencias de categorías de productos y bodegas; debe aplicarse antes de usar sus endpoints de creación actualizados. El frontend y el backend deben actualizarse juntos porque la recepción devuelve `movimientosInventario` como una lista. La reversión se bloquea cuando existen recepciones con varias bodegas, para evitar una conversión que pierda destinos.

## Ampliación: login adaptable a móvil, tablet y escritorio

### Causa encontrada

El panel de marca conservaba un margen lateral de 130 px cuando la pantalla pasaba a una sola columna. La curva decorativa utilizaba dimensiones y posiciones fijas; el formulario también combinaba un ancho fijo con rellenos sin un ajuste uniforme del modelo de caja. Esta combinación reducía el espacio útil y descentraba el contenido, especialmente al rotar una tablet.

### Solución

- Desde 1200 px de ancho se muestran dos columnas flexibles: marca y acceso. Ambas permiten que el contenido se ajuste sin imponer un ancho mínimo que desborde la pantalla.
- Hasta 1199 px se utiliza una cabecera de marca compacta sobre el formulario. El logo y los textos se alinean sin desplazamientos laterales. Esto cubre las orientaciones habituales de tablet; las tablets de mayor ancho utilizan la composición amplia si hay espacio suficiente.
- Hasta 599 px se reducen el logo, los espacios y la tipografía del panel. La tarjeta conserva un ancho máximo de 448 px y se adapta al espacio restante con `box-sizing: border-box`.
- Cuando el ancho es inferior a 1200 px y la altura no supera 600 px, la cabecera se compacta más y se oculta únicamente el lema secundario. El formulario puede crecer y el documento puede desplazarse verticalmente; no se fija una altura que recorte los campos o el botón.
- Se utiliza `100svh`, con respaldo `100vh`, para tener en cuenta las barras del navegador móvil. No se bloquea el desplazamiento de la página.
- El panel conserva una composición corporativa roja con reflejos amarillos y círculos sutiles contenidos dentro de sus límites. Se elimina la curva blanca que invadía la composición.
- Los campos utilizan texto de 16 px y los controles principales disponen de objetivos táctiles de al menos 44 px. El botón para mostrar la contraseña usa un icono consistente y etiquetas accesibles.
- Se relacionan las etiquetas y mensajes con sus campos, se identifica el estado de carga y se presentan los errores de acceso dentro de la tarjeta. Se corrigen los caracteres dañados del mensaje de usuario y se alinea la ayuda de contraseña con el mínimo de 4 caracteres que ya aplicaba el formulario.
- La decoración es estática y las transiciones se desactivan cuando el usuario solicita movimiento reducido.

### Matriz de comportamiento prevista

Estas dimensiones documentan la composición definida por los estilos; no representan una certificación visual sobre dispositivos físicos.

| Dimensiones de referencia | Composición |
| --- | --- |
| 320 × 568 y 390 × 844 | Móvil, cabecera compacta y formulario de ancho flexible. En pantallas bajas se aplica la cabecera reducida. |
| 768 × 1024, 820 × 1180 y 1024 × 1366 | Tablet vertical, cabecera sobre tarjeta centrada. |
| 1024 × 768 y 1180 × 820 | Tablet horizontal, misma composición apilada sin el margen lateral anterior. |
| 844 × 390 | Pantalla horizontal baja, cabecera reducida y desplazamiento vertical cuando el contenido lo requiera. |
| 1366 × 1024 y 1440 × 900 | Composición amplia en dos columnas. |

### Verificación de esta ampliación

Se comprueban TypeScript y plantillas Angular. Las cuatro pruebas nuevas del componente verifican las etiquetas y el control de contraseña, los mensajes de validación, la presentación de errores del servidor y el estado de carga sin envíos duplicados. Junto con las pruebas anteriores, el resultado es de 31 pruebas aprobadas.

El navegador integrado volvió a no estar disponible en esta sesión. Las pruebas de componente usan un entorno DOM de pruebas que no calcula la distribución visual; por tanto, la revisión renderizada de esta matriz y de dispositivos físicos sigue pendiente. Esta ampliación solo modifica el frontend y no añade migraciones.

## Ampliación: consistencia de Maestros y códigos internos

### Navegación y presentación

- Se retira la tarjeta de “Lugares y áreas” y se elimina la carga de su pantalla desde el enrutador. Un enlace anterior a `/maestros/lugar-area` redirige a Maestros. Se conservan los servicios, datos y relaciones que todavía utiliza Recepción.
- Cargos, Terceros, Productos, Categorías de productos, Vehículos y Bodegas comparten un encabezado con regreso a la izquierda y acción principal a la derecha. El panel principal también utiliza el encabezado y las tarjetas comparten márgenes, color, tipografía y comportamiento accesible por teclado.
- Se eliminan los títulos duplicados de las tarjetas de contenido y los estilos particulares que imponían márgenes distintos. Se reutilizan los tokens visuales de las pantallas de datos y calidad.
- La búsqueda, el estado y la acción “Limpiar” se centralizan en un componente compartido. Terceros conserva además el filtro por rol, combinado con los otros filtros. Las búsquedas ignoran diferencias de mayúsculas y tildes y utilizan los campos legibles de cada tabla; los códigos ocultos no participan en las búsquedas de categorías y bodegas.
- Las tablas comparten paginación de 5, 10, 25 o 50 filas, mensajes vacíos, edición azul, eliminación roja y estados verde/rojo con texto. Cargos incorpora la misma paginación sin perder sus permisos ni su editor.
- Los seis formularios modales utilizan un estilo compartido para encabezados, iconos, márgenes, acciones, controles de estado y desplazamiento del contenido. Se unifican sus límites en 900 px de ancho, 96vw y 92dvh de alto. Los filtros y grupos de campos se apilan en pantallas pequeñas, y las tablas se desplazan horizontalmente dentro de su contenedor.
- El catálogo histórico de Materias primas sigue oculto en el panel, como antes. Su pantalla accesible por ruta también recibe los filtros y estilos compartidos.

### Categorías de productos y bodegas

- Se eliminan la columna y el campo de código en ambos catálogos, en creación y edición. El detalle de categoría y los nombres de categoría dentro de Maestros tampoco muestran ese identificador.
- El backend asigna `CP-000001` a categorías y `BD-000001` a bodegas, mediante secuencias PostgreSQL independientes. El relleno de seis cifras es mínimo; no limita el crecimiento del consecutivo.
- La migración arranca después del mayor consecutivo existente de cada prefijo. No renombra registros ni cambia códigos históricos como `MP-CAR`, que siguen disponibles para el backend y sus reglas.
- Crear no exige código y utiliza siempre el generado por el servidor. Editar descarta cambios entrantes al código para conservar el histórico. Las secuencias evitan repetir códigos incluso con solicitudes simultáneas; pueden dejar saltos si se cancela una transacción.
- Se conserva el flujo de bodega activa y destino predeterminado de producto terminado. Inactivar una bodega retira su condición de destino predeterminado.

### Verificación de esta ampliación

- Frontend: `npm run test:mejoras`, **39 pruebas aprobadas en 11 archivos**. Las ocho nuevas cubren filtros combinados y limpieza, códigos ocultos y fuera de búsqueda, persistencia del filtro al recargar datos, regreso a la primera página, creación y edición sin código, bloqueo de envíos repetidos y destino de PT.
- Backend: `node --test --test-isolation=none tests/maestros-codigos.test.js tests/recepcion.service.test.js tests/mejoras-consistencia.test.js`, **34 pruebas aprobadas**. Se probaron creación sin código, conservación de históricos y del flujo de PT, inicio y continuación de secuencias, 25 solicitudes simultáneas por catálogo y reversión de la migración sin borrar registros.
- Comprobación de TypeScript y plantillas correcta; compilación de producción correcta. Permanecen los avisos anteriores de Control de producción y SweetAlert2.
- ESLint sin errores ni advertencias en los archivos JavaScript de esta ampliación y diferencias sin errores de espacios.
- La migración se probó en PGlite aislado. No se aplicó a la base configurada ni se realizó un despliegue.
- El navegador integrado continúa sin estar disponible. Las pruebas de componente validan estructura e interacción en DOM, pero no sustituyen la revisión visual renderizada en tablet, móvil y escritorio, que permanece pendiente.

## Ajuste posterior: acceso al panel de administración

- Se elimina el enlace superior “Administración” del menú lateral. El acceso inferior antes llamado “Configuración” se presenta como “Panel de administración” y conserva la ruta `/administracion`.
- Se unifica ese nombre en el panel y en su tarjeta de Inicio. El menú de Configuración de Calidad mantiene su nombre y función.
- Se retira la tarjeta de Maestros del panel de administración; Maestros conserva su acceso directo en el menú lateral.
- La zona inferior permite ajustar el texto del nuevo nombre y permanece accesible en pantallas pequeñas, donde antes se ocultaba.
- Comprobación de TypeScript, plantillas Angular y compilación de desarrollo correctas. No se requieren nuevas migraciones para este ajuste. La revisión visual renderizada mantiene la limitación de navegador documentada anteriormente.

## Ajuste posterior: buscador de Programas en Calidad

Programas utiliza el mismo estilo compartido de búsqueda que Tipos de inspección y las demás pestañas basadas en el maestro de calidad: ancho disponible, altura de 54 px, icono, fondo, borde y separación. Se conserva la búsqueda por nombre o descripción y el regreso a la primera página al filtrar.

## Ajuste posterior: presentación de Acciones correctivas

Se toma Inspecciones como referencia para los márgenes, el aviso informativo azul, los bordes, las tarjetas y las sombras. Se retiran las negritas de los nombres de formatos y de las filas del historial; los detalles, etiquetas, requisitos y resúmenes utilizan pesos moderados. La etiqueta superior de Calidad y los encabezados de columnas conservan su jerarquía visual. Los estados usan textos legibles y mantienen los colores compartidos.

Se limita el estilo de las etiquetas de encabezado para evitar que afecte a otros textos o estados. Las celdas del historial conservan su comportamiento de tabla. En pantallas pequeñas, los encabezados desplegables muestran fecha, inicio, responsable, estado y cantidad de acciones, con etiquetas y distribución adaptable, en lugar de ocultar esos datos. Se conservan las tareas, evidencias, mediciones y aprobaciones. Compilación de producción correcta, con los avisos anteriores de Control de producción y SweetAlert2. La revisión visual renderizada mantiene la limitación documentada anteriormente.

## Ampliación del 10 de noviembre de 2026: Lugares, Roles y códigos de formatos

### Lugares de inspección

Se conserva el CRUD con creación, consulta, edición y activación/inactivación, según la preferencia confirmada por el usuario. La desactivación mantiene los registros y sus relaciones históricas. No se incorpora borrado definitivo.

La tabla anterior utilizaba una cuadrícula con ancho mínimo superior al espacio disponible dentro de un panel con desbordamiento oculto. Esto podía recortar las acciones. Se reemplaza por una tabla HTML con desplazamiento horizontal dentro de su contenedor, acciones etiquetadas y mensajes al pasar el puntero. La distribución pasa a una sola columna hasta 1200 px, y los nombres largos de puntos de muestreo pueden ajustarse sin desplazar sus controles. Se respetan los permisos de crear y editar, y se impide activar un lugar mientras su punto de muestreo esté inactivo.

### Búsqueda de permisos en Roles

El formulario de creación y edición del rol incorpora “Buscar permisos disponibles”, con búsqueda por nombre, código, descripción o módulo. Ignora tildes y diferencias de mayúsculas; permite combinar palabras y limpiar el término. Oculta los grupos sin coincidencias y muestra un mensaje cuando no encuentra permisos.

Los permisos ya elegidos se conservan aunque queden ocultos por la búsqueda y se envían al guardar. Cuando hay una búsqueda activa, “Seleccionar visibles” solo selecciona o retira los resultados mostrados del módulo, conservando las demás selecciones. El contador sigue indicando el total elegido.

### Código manual solo en formatos de calidad

- El código vuelve al formulario, a la tabla de formatos y al detalle. Se carga el valor existente al editar y el usuario puede modificarlo explícitamente.
- Es obligatorio al crear y al guardar desde el formulario. Se validan entre 2 y 30 caracteres: letras mayúsculas, números, guion y guion bajo. Se mantiene la unicidad; un código duplicado produce un conflicto de validación y revierte la creación.
- El controlador conserva el código enviado. El modelo de formato queda excluido de la generación automática, también en creaciones múltiples. Los demás modelos y catálogos conservan su generación automática y su presentación anterior.
- Las actualizaciones parciales de estado permiten omitir el código para conservar el existente. Enviar uno vacío o inválido se rechaza. No se renumeran los históricos.
- Se actualiza OpenAPI para documentar el código como un campo manual obligatorio al crear, sin la marca de solo lectura.
- No se requieren nuevas migraciones: la columna obligatoria y su restricción de unicidad ya existen. Frontend y backend deben actualizarse juntos para restaurar este comportamiento.

### Verificación

- Frontend: **46 pruebas aprobadas en 14 archivos**, incluyendo siete nuevas de búsqueda y conservación de permisos, validación y edición del código, y controles CRUD de lugares con permisos y conservación de históricos.
- Backend: **38 pruebas aprobadas** en códigos manuales de formatos, códigos internos de Maestros, recepción y consistencia. Se cubren códigos ausentes o inválidos, conservación de los demás códigos automáticos, creación con versión inicial, edición, actualizaciones de estado y rechazo de duplicados.
- Compilación de producción y comprobación de TypeScript y plantillas correctas. Permanecen los avisos previos de tamaño de estilos de Control de producción y la dependencia CommonJS SweetAlert2.
- ESLint sin errores ni advertencias en los archivos JavaScript afectados; comprobación de diferencias sin errores de espacios. OpenAPI verificado al cargar su especificación.
- Las verificaciones se ejecutan con datos aislados y componentes en DOM de pruebas. No se realizó despliegue, migración ni modificación de datos en la base configurada. No se realizó una inspección visual renderizada de esta ampliación; queda pendiente esa comprobación.

## Hallazgos adicionales y límites de la revisión

1. El ejecutor general de pruebas del frontend encuentra imports obsoletos en pruebas de bodegas, materia prima, productos y proveedores. La configuración `tsconfig.mejoras.spec.json` permite ejecutar las pruebas del cambio sin alterar esas pruebas antiguas. No equivale a afirmar que toda la suite histórica pasa.
2. Existen carpetas paralelas `src/core` y `src/app/core`, con configuración y servicios similares. Conviene consolidarlas en una tarea específica para evitar divergencias de autenticación y configuración de API.
3. No se completó la inspección visual interactiva: el navegador integrado no estaba disponible y el control de Windows detuvo el acceso al no poder verificar la URL. La compilación y las pruebas de formularios sí se completaron; la comprobación visual en escritorio y móvil queda pendiente.
4. Este reporte corresponde a revisión de código y pruebas aisladas. No certifica los datos ni la configuración del entorno desplegado. No se ejecutó la migración sobre la base configurada ni se realizó un despliegue.
