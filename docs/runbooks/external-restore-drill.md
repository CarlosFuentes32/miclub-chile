# Runbook: restore drill externo

1. Crear base temporal vacía.
2. Definir `TEMPORARY_RESTORE_DATABASE_URL`.
3. Definir `ALLOW_TEMPORARY_RESTORE=true`.
4. Ejecutar `npm run backup:external:restore`.
5. Revisar conteos y diferencias.
6. Destruir la base temporal solo con autorización.

Nunca usar producción como destino.

