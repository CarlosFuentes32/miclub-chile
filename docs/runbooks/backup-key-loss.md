# Runbook: pérdida de clave de backup

Si se pierde `BACKUP_ENCRYPTION_KEY`, los backups cifrados con esa clave no son recuperables.

Acciones:

1. Declarar incidente crítico.
2. Rotar clave.
3. Crear nuevo backup completo.
4. Validar restore temporal.
5. Marcar backups antiguos como no restaurables si corresponde.

