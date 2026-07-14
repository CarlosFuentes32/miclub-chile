# Runbook: restaurar base de datos

1. Confirmar incidente y detener cambios no críticos.
2. Crear backup del estado actual si la base responde.
3. Seleccionar último backup `VERIFIED`.
4. Restaurar en base temporal, no producción.
5. Ejecutar validación:
   - usuarios;
   - comercios;
   - clientes;
   - programas;
   - recompensas;
   - transacciones;
   - auditoría;
   - migraciones.
6. Ejecutar Playwright staging contra la base restaurada.
7. Documentar diferencias.
8. Solicitar aprobación humana si se requiere restaurar producción.

No ejecutar `DROP`, `TRUNCATE`, `db push` ni seeds sobre producción.
