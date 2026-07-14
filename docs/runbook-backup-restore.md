# Runbook de respaldo y recuperación

Este runbook define el mínimo operativo antes de pilotos comerciales. No incluye secretos ni URLs privadas.

## Respaldos

- Producción debe tener backup automático diario de PostgreSQL en el proveedor.
- Antes de migraciones, cambios de billing, limpieza de datos o tareas masivas, generar un respaldo recuperable.
- Mantener evidencia del respaldo: fecha, ambiente, proveedor, tamaño aproximado y responsable.
- No descargar dumps productivos a equipos personales salvo necesidad justificada; si se descargan, deben quedar fuera de Git.

## Verificación

1. Confirmar que el proveedor reporta backup reciente.
2. Ejecutar `GET /api/health` y confirmar `checks.database: "ok"`.
3. Revisar logs del backend por errores de conexión.
4. Registrar resultado en la bitácora operacional.

## Restauración

La restauración sobre producción es una acción crítica y requiere autorización humana explícita.

1. Identificar incidente y hora aproximada.
2. Seleccionar backup anterior al incidente.
3. Restaurar primero en staging o en una base temporal.
4. Validar login, comercios, programas, clientes, recompensas y transacciones.
5. Solo con autorización, programar ventana de restauración productiva.
6. Verificar dominios, API, base y paneles después de restaurar.

## Evidencia esperada por auditoría

- ID o nombre del backup.
- Ambiente restaurado.
- Checklist de validación.
- Responsable y fecha.
- Decisión final: conservar, restaurar o descartar.
