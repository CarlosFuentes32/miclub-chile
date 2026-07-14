# Configuración manual del monitoreo de staging

## GitHub Secrets

Crear o verificar:

- `E2E_API_URL`
- `E2E_LANDING_URL`
- `E2E_ADMIN_URL`
- `E2E_CUSTOMER_URL`
- `E2E_COMMERCE_URL`
- `E2E_CASHIER_URL`
- `E2E_VERCEL_BYPASS_SECRET`
- `MONITORING_TOKEN`

## Railway staging

Configurar en el backend staging:

- `APP_ENV=staging`
- `MONITORING_TOKEN`
- `ALERT_EMAIL`
- `ALERT_COOLDOWN_MINUTES=30`
- `ALERT_SLACK_WEBHOOK_URL` si aplica
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `SUPPORT_EMAIL`

## Prueba

1. Desplegar la rama de trabajo en staging.
2. Ejecutar migración no destructiva de incidentes en staging.
3. Correr workflow `Staging Monitoring`.
4. Entrar al panel Admin staging.
5. Abrir `Estado del Sistema`.
6. Simular incidente staging.
7. Confirmar alerta.
8. Resolver incidente.
9. Confirmar recuperación.
