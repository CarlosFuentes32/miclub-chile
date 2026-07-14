# Revisión de migraciones para producción

Commit candidato: `606a5bd86880f23ebfb103e2dc818b86071b5bba`.

Producción observada expone health básico, por lo que existe drift frente a staging. Antes de ejecutar migraciones productivas se debe consultar `_prisma_migrations` en producción con credenciales autorizadas.

## Migraciones Enterprise potencialmente pendientes

| Migración | Tipo | Tablas/objetos | Riesgo | Compatibilidad | Validación posterior |
| --- | --- | --- | --- | --- | --- |
| `202607080001_super_admin` | Roles/admin | Usuarios/roles | Medio | Expansiva | Login Super Admin |
| `202607080002_promote_super_admin` | Promoción usuario | `users` | Medio | Data change controlado | Rol correcto |
| `202607100001_commercial_leads` | Nueva tabla | `commercial_leads` | Bajo | Expansiva | Landing lead |
| `202607100002_password_reset_tokens` | Nueva tabla | reset tokens | Bajo | Expansiva | Reset password |
| `202607100003_billing_subscriptions` | Enums/tablas billing | plans, subscriptions, payments, webhooks | Medio | Expansiva | Billing E2E |
| `202607110001_enterprise_incidents` | Incidentes | incidentes/acciones/alertas | Medio | Expansiva | Simulación staging |
| `202607110002_enterprise_backups` | Catálogo backups | backup/restore/rollback | Bajo | Expansiva | Backup overview |
| `202607120001_enterprise_logs_audit` | Auditoría/logs | audit/system errors | Medio | Expansiva | Logs/audit |
| `202607120002_enterprise_security_sessions` | Sesiones seguridad | sessions/rate limits | Medio | Expansiva | Login/refresh |
| `202607120003_enterprise_support_panel` | Soporte | tickets/notes/macros/SLA | Medio | Expansiva; ya fue recuperada en staging | Panel soporte |
| `202607121900_enterprise_billing_commercial_readiness` | Billing Sprint 7 | enums, columnas, eventos, descuentos, requests, reminders | Medio | Expansiva/no destructiva | E2E billing |

## Revisión SQL Sprint 7

La migración `202607121900_enterprise_billing_commercial_readiness`:

- Agrega valores enum.
- Agrega columnas con defaults seguros o nullable.
- Crea tablas nuevas.
- Crea índices.
- No contiene `DROP`, `TRUNCATE`, ni `DELETE` como sentencia DML/DDL.

Nota: contiene `ON DELETE CASCADE` en FK de descuentos hacia suscripción, lo cual solo aplica si se elimina una suscripción. No hay flujos de eliminación física de suscripciones autorizados para producción.

## Reglas antes de producción

No ejecutar migración si se detecta:

- `DROP TABLE`.
- `TRUNCATE`.
- `DELETE` masivo.
- Columna `NOT NULL` sin default/backfill.
- Renombre irreversible.
- Backfill sin límite.

Si aparece drift real, dividir en expand/migrate/contract.
