# Auditoría inicial Sprint 4 — Logs, auditoría y trazabilidad

## Estado inicial observado

- Existía `AuditLog` básico con usuario, comercio, acción, entidad, metadata y fecha.
- Existía `AuditService` simple usado por Admin, billing, impersonation y soporte.
- Existía observabilidad de salud e incidentes del Sprint 1 y Sprint 2.
- Existía sistema de backups del Sprint 3.
- No existía request ID/correlation ID global.
- No existía exception filter global sanitizado.
- No existía deduplicación de errores.
- No existía panel dedicado de errores.
- La auditoría no guardaba resultado, riesgo, endpoint, HTTP status, duración, versión, commit ni build.
- La exportación existente era genérica y no aplicaba protección CSV específica para auditoría.

## Decisión técnica

Se reutilizó `AuditLog` y se amplió con una migración no destructiva. No se creó un sistema paralelo de auditoría.

Se agregó `SystemError` para deduplicación porque conceptualmente es distinto a un evento de auditoría.

## Componentes reutilizados

- `AuditService`.
- `IncidentsService`.
- `BackupsService`.
- Panel Super Admin.
- Variables de versionado del Sprint 1.

## Migración requerida

`202607120001_enterprise_logs_audit`

La migración:

- agrega columnas opcionales o con default a `audit_logs`;
- permite `user_id` nulo para eventos sin actor identificado;
- crea enums nuevos;
- crea tabla `system_errors`;
- agrega índices de búsqueda por request ID, correlation ID, ambiente, categoría, resultado y estado.

No ejecuta DELETE, TRUNCATE ni operaciones destructivas.

## Riesgos controlados

- La auditoría de eventos críticos sigue siendo síncrona donde ya existía.
- El registro de errores no expone secretos.
- La retención es solo dry-run.
- La integración con incidentes deduplica para evitar tormentas de incidentes.

