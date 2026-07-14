# Auditoría inicial Sprint 3 — Backups y Disaster Recovery

Fecha: 2026-07-11.

## Alcance revisado

- Railway staging.
- PostgreSQL staging.
- Prisma.
- Migraciones existentes.
- Scripts actuales.
- Variables documentadas.
- Estado de staging observado en Sprint 2.
- Restricciones productivas.

## Evidencia actual

- Staging API corre en Railway: `miclub-chile-staging.up.railway.app`.
- Health live staging: OK.
- Health ready staging: OK.
- Health detallado: degradado por DNS custom staging y Resend pendiente.
- PostgreSQL staging es servicio separado en Railway.
- Tablas de incidentes Sprint 2 existen en staging.
- La rama `staging` fue actualizada al commit `71eafaa` durante cierre Sprint 2.
- GitHub Actions E2E staging pasó en run `29169296612`.

## Backups existentes

- Railway/PostgreSQL puede ofrecer snapshots/backups del proveedor, pero la política exacta, retención y restauración deben confirmarse en el panel Railway según plan activo.
- No existía antes de este sprint un catálogo interno de backups.
- No existían registros internos de restore drill.
- No existían registros internos de rollback plan.

## Qué no existía

- Tabla de backups.
- Tabla de restores.
- Tabla de rollback.
- Panel Super Admin para continuidad operacional.
- Workflow dedicado a validar lógica de backup/restore.
- Documentación específica de restore y disaster recovery.

## Riesgos

- Dependencia del proveedor para snapshots reales.
- Sin `RESEND_API_KEY` staging, las alertas de recuperación operativa quedan omitidas.
- DNS custom staging pendiente impide health detallado 100% OK.
- Si no se configura almacenamiento externo, el backup de aplicación queda como catálogo/validación lógica y no como artefacto portable completo.
- Restauración productiva requiere proceso humano; correctamente no se automatiza.

## Qué depende del proveedor

- Snapshots físicos.
- PITR si el plan lo soporta.
- Retención de backups.
- Restauración de base completa.
- Variables históricas.
- Disponibilidad de Railway.

## Qué implementa MiClub

- Catálogo de backups.
- Validación lógica de integridad.
- Restore drill seguro.
- Bloqueo de restore directo a producción.
- Planes de rollback.
- Panel Super Admin.
- Tests automatizados.
- Workflow CI de validación.

## Recomendación

Para piloto comercial: mantener backups diarios del proveedor y ejecutar backup lógico validado antes de deploys/migraciones. Para etapa comercial avanzada: contratar PITR o snapshots con retención garantizada y almacenamiento externo cifrado.
