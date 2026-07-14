# Runbook: falla backup externo

1. Revisar logs sanitizados del workflow.
2. Confirmar que no se imprimieron secretos.
3. Verificar disponibilidad de Railway PostgreSQL.
4. Verificar credenciales R2.
5. Verificar `BACKUP_ENCRYPTION_KEY`.
6. Reintentar manualmente solo en staging.
7. Crear incidente si falla de nuevo.

