# Observabilidad SaaS Enterprise

La observabilidad de MiClub Chile se implementa como una capa central dentro de la API.

## Componentes

- `ObservabilityService`: genera la fuente única de verdad del estado del sistema.
- `GET /api/health`: health enterprise consumible por humanos y automatizaciones.
- `GET /health`: alias operativo sin prefijo para proveedores o monitores externos.
- `GET /api/admin/system-status`: endpoint protegido para Super Admin.
- Panel Admin **Estado del Sistema**: visualización profesional con semáforos.

## Qué valida

1. API.
2. PostgreSQL con query real `SELECT 1`.
3. Prisma Client con query y versión del cliente.
4. Conectividad hacia URLs configuradas.
5. Variables críticas y recomendadas.
6. Metadata Railway.
7. Metadata Vercel/frontends.
8. URLs de Landing, Cliente, Comercio, Cajero y Administrador.
9. Configuración Resend.
10. Uso de HTTPS.
11. Último deploy.
12. Ambiente.
13. Commit.
14. Versión.
15. Fecha de build.
16. Última ejecución Playwright.
17. Memoria y uptime.

## Seguridad

- No expone secretos.
- Redacta IDs largos de proveedor.
- No muestra `DATABASE_URL`, JWT secrets, API keys ni tokens.
- El endpoint de panel está protegido por JWT + `SUPER_ADMIN`.

## Cómo interpretar

- Muchos `unknown` no significan caída: indican falta de metadata operativa.
- Un `error` en DB/Prisma debe tratarse como incidente alto.
- Un `warning` en emails indica que el sistema puede funcionar, pero sin correo transaccional completo.
- Un `warning` en Vercel/Railway normalmente indica que faltan variables de proveedor, no necesariamente caída.

## Pruebas

```bash
npm run test:enterprise-health
```

La prueba cubre:

- Health OK.
- Base desconectada.
- Variables faltantes.
- Tiempo de respuesta.
- Versionado.
- Commit.
- Ambiente.
- Frontend con error HTTP 503.

## Próximo paso recomendado

En Sprint 2 se debería conectar esta observabilidad con monitoreo externo:

- UptimeRobot, Better Stack o Grafana Cloud.
- Alertas por email/Slack.
- Retención de incidentes.
- Historial de health snapshots.
