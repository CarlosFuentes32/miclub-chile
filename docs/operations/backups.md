# Backups Enterprise

Sprint: Fase 1 Enterprise — Sprint 3.

MiClub Chile implementa un catálogo operativo de backups para dejar evidencia de continuidad operacional sin exponer secretos.

## Arquitectura

El sistema combina tres capas:

1. Backups/snapshots del proveedor PostgreSQL/Railway.
2. Catálogo interno `backup_records`.
3. Validación lógica de integridad mediante Prisma y SQL read-only.

El catálogo interno no guarda `DATABASE_URL`, contraseñas, tokens, cookies ni API keys.

## Tipos soportados

- `AUTOMATIC`
- `MANUAL`
- `SCHEDULED`
- `PRE_DEPLOY`
- `PRE_MIGRATION`
- `PRE_RESTORE`
- `PRE_DATA_CLEANUP`
- `SIMULATION`

## Qué registra cada backup

- ID.
- Fecha/hora.
- Ambiente.
- Base.
- Versión.
- Commit.
- Responsable.
- Tipo.
- Estado.
- Duración.
- Tamaño si existe artefacto local.
- Resultado.
- Checksum lógico.
- Validación.

## Validación posterior

Después de cada backup se valida:

- Conexión PostgreSQL.
- Prisma.
- Tablas críticas.
- Conteos.
- Migraciones.
- Relaciones principales.
- Checksum lógico.

Si la validación falla, el backup queda `FAILED`.

## Artefactos

Si `BACKUP_STORAGE_DIR` está configurado, se crea un manifiesto local seguro. Si `pg_dump` existe en el entorno, el sistema intenta generar un dump custom local.

En Railway se recomienda mantener snapshots/backups del proveedor como fuente primaria y usar el catálogo MiClub como evidencia operacional.

## Frecuencia sugerida

- Programado diario.
- Manual antes de cambios importantes.
- Obligatorio antes de migraciones.
- Obligatorio antes de limpieza de datos.
- Obligatorio antes de cualquier restore.
