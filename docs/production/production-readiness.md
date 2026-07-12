# Production readiness — MiClub Chile Sprint 8

Fecha de evaluación: 2026-07-12.

Commit candidato: `606a5bd86880f23ebfb103e2dc818b86071b5bba`.

Estado: preparado para promoción controlada solo después de resolver los prerequisitos externos marcados como bloqueantes.

## Pendientes heredados

| Pendiente | Estado | Evidencia | Riesgo | Acción requerida |
| --- | --- | --- | --- | --- |
| `MONITORING_TOKEN` | Bloqueante para health verde | Playwright staging pasó, pero health muestra `runId: unknown` | Observabilidad incompleta post-deploy | Sincronizar GitHub Secret y Railway staging/producción sin exponer valor |
| Resend staging | Bloqueante para piloto | Health staging `hasApiKey: false` | Recuperación de contraseña/correos no probados real | Configurar `RESEND_API_KEY` staging y allowlist QA |
| DNS staging | Bloqueante para staging 100% | `staging*.miclubchile.cl` no resuelve DNS | Health degradado y pruebas visuales con custom domains no válidas | Crear DNS/Vercel staging o cambiar health a previews estables reales |
| Backups gestionados/PITR | Condición para producción | No se confirmó política externa desde proveedor | Riesgo de recuperación insuficiente | Confirmar retención, PITR, snapshots y restore drill |

## Matriz de preparación

| Componente | Estado staging | Estado producción observado | Diferencia | Riesgo | Acción previa | Validación posterior |
| --- | --- | --- | --- | --- | --- | --- |
| API | Enterprise health ready OK | Health básico OK; `/api/health/live` y `/api/health/ready` 404 | Producción no tiene versión Enterprise actual | Alto | Deploy controlado API después de backup | `/api/health/live`, `/api/health/ready`, `/api/health` |
| PostgreSQL | Migraciones Sprint 1-7 aplicadas por staging | Migraciones productivas no inventariadas por DB directa | Drift desconocido | Alto | `prisma migrate status` contra producción solo tras autorización read-only segura | Conteos + tabla `_prisma_migrations` |
| Frontends | Código compilado; custom DNS staging no resuelve | Dominios productivos HTTP 200 SSL OK | Staging custom incompleto | Medio | Resolver staging DNS/previews | Carga paneles + versión API correcta |
| Emails | Código listo; Resend sin API key staging | Producción no validada | Correos críticos no comprobados | Alto | Configurar Resend staging y luego producción con QA interno | Envío QA, reset token uso único |
| Billing | Staging E2E OK | No promovido | Drift funcional | Medio | Migraciones y smoke post-deploy | Pago manual pendiente/aprobado solo QA autorizado |
| Soporte | Staging listo | No promovido | Drift funcional | Medio | Deploy + validación Super Admin/Soporte | Ticket soporte y consulta 360 |
| Observabilidad | Health degraded por warnings heredados | Health básico | Drift mayor | Alto | Resolver token y DNS; deploy Enterprise | Health sin errores obligatorios |
| Backups | Workflows de validación OK | Política proveedor pendiente | Falta garantía operativa | Alto | Confirmar backup gestionado y restore temporal | Restore drill documentado |
| Seguridad | Tests enterprise OK | No promovido | Drift de middleware/sesiones | Alto | Promoción controlada | Login/roles/rutas 401 |
| GitHub Actions | E2E + Backup success en staging | No aplica | OK | Bajo | Mantener checks obligatorios | Actions verdes en commit final |

## Inventario productivo seguro observado

Sin modificar producción:

- Landing: `https://miclubchile.cl` responde HTTP 200 con SSL válido.
- Cliente: `https://app.miclubchile.cl` responde HTTP 200 con SSL válido.
- Comercio: `https://comercio.miclubchile.cl` responde HTTP 200 con SSL válido.
- Cajero: `https://cajero.miclubchile.cl` responde HTTP 200 con SSL válido.
- Administrador: `https://admin.miclubchile.cl` responde HTTP 200 con SSL válido.
- API: `https://api.miclubchile.cl/health` y `https://api.miclubchile.cl/api/health` responden health básico.
- API Enterprise: `https://api.miclubchile.cl/api/health/live` y `ready` responden 404, por lo tanto producción no está en el commit Enterprise actual.
- Rama `main`: `123742051e13d39cd342de9ab48c9930831ed5cd`.
- Rama staging/candidata: `606a5bd86880f23ebfb103e2dc818b86071b5bba`.

## Decisión actual

Resultado: GO CON CONDICIONES para preparar promoción. NO GO para ejecutar producción hasta cerrar token, Resend staging, DNS staging y backup/PITR.
