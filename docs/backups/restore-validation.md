# Validación de restore temporal

El restore nunca se aplica sobre producción.

Proceso:

1. Descargar metadata y backup cifrado desde R2.
2. Validar SHA-256 del cifrado.
3. Descifrar con AES-256-GCM.
4. Validar SHA-256 del dump.
5. Ejecutar `pg_restore` contra `TEMPORARY_RESTORE_DATABASE_URL`.
6. Comparar conteos críticos.
7. Rechazar si hay tablas faltantes o diferencias.

Variable obligatoria:

- `ALLOW_TEMPORARY_RESTORE=true`

