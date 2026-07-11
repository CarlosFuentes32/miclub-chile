# Monitoreo externo de staging

Sprint: Fase 1 Enterprise — Sprint 2.

MiClub Chile usa un monitoreo externo programado con GitHub Actions para revisar staging cada 15 minutos. Este monitor no toca producción y valida:

- API live: `/api/health/live`.
- API ready: `/api/health/ready`.
- Health Enterprise: `/api/health`.
- Landing y paneles staging.
- Evaluador interno de incidentes: `/api/monitoring/run`.

## Proveedor de monitoreo

Proveedor inicial: GitHub Actions programado, complementado por métricas nativas de Railway y Vercel.

Este proveedor es suficiente para el Sprint 2 porque genera ejecuciones recurrentes, evidencia histórica, alertas de workflow fallido y artefactos. Para operación comercial más exigente se recomienda sumar Better Stack, UptimeRobot, Grafana Cloud o Checkly con chequeos multi-región.

## Variables requeridas

Configurar como GitHub Secrets:

- `E2E_API_URL`
- `E2E_LANDING_URL`
- `E2E_ADMIN_URL`
- `E2E_CUSTOMER_URL`
- `E2E_COMMERCE_URL`
- `E2E_CASHIER_URL`
- `E2E_VERCEL_BYPASS_SECRET`
- `MONITORING_TOKEN`

Configurar en la API de staging:

- `APP_ENV=staging`
- `MONITORING_TOKEN`
- `ALERT_EMAIL`
- `ALERT_COOLDOWN_MINUTES`
- `ALERT_SLACK_WEBHOOK_URL` si se habilita Slack

Nunca reutilizar secretos de producción.

## Cómo verificarlo

1. Ejecutar manualmente el workflow `Staging Monitoring`.
2. Confirmar que sube artefactos `live.json`, `ready.json`, `health.json` e `incidents.json`.
3. Confirmar que `/api/monitoring/run` crea o resuelve incidentes sin duplicarlos.
4. Confirmar que un fallo crítico envía alerta por email si `ALERT_EMAIL` está configurado.

## Interpretación

- Workflow verde: staging responde correctamente o solo hay degradaciones controladas.
- Workflow rojo: el monitor externo detectó caída real, health no ready, frontend inaccesible o token inválido.
- `status=degraded`: hay servicio no crítico con advertencia/falla; requiere revisión.
- `status=down`: estado crítico no aceptable para piloto.
