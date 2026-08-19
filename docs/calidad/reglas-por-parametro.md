# Reglas reutilizables por parámetro

## Modelo

`ParametroCalidad` concentra el tipo de respuesta, unidad, rango, precisión y valores predeterminados. Sus reglas se reutilizan en cualquier formato que seleccione el parámetro.

`CampoFormato` conserva la etiqueta, ayuda, orden y overrides operativos. Al crearlo o cambiar su parámetro, el backend copia la configuración vigente del parámetro para mantener compatibilidad con la ejecución existente.

`ReglaCalidad.parametroCalidadId` es el propietario actual. `campoFormatoId` queda nullable y deprecado para compatibilidad de despliegue; las reglas migradas ya no lo utilizan.

## Evaluación

1. Se guarda una respuesta para un campo.
2. El motor obtiene las reglas activas de `campo.parametroCalidadId`.
3. Evalúa las condiciones con `AND` u `OR`.
4. Un escenario `CUMPLE` no genera desviación.
5. Un escenario `NO_CUMPLE` crea o actualiza la desviación y materializa las acciones configuradas.

## Pruebas

- `node scripts/auditar-refactor-reglas.js`: inspección de configuración persistida.
- `node scripts/probar-motor-reglas-parametro.js`: prueba transaccional de Cloro, pH y TEMP-CAVA con rollback.
- `node scripts/probar-api-refactor-reglas.js`: smoke test autenticado de parámetros, reglas y versión completa.
