# Alertas operacionales

Las alertas del Sprint 2 se generan desde el backend de staging mediante `IncidentsService`.

## Canales

- Email: implementado mediante `EmailService.adminNotice`.
- Slack: preparado mediante `ALERT_SLACK_WEBHOOK_URL`.
- WhatsApp: pendiente de proveedor oficial. No se implementan envíos no oficiales ni scraping.

## Cuándo se alerta

Se envían alertas para incidentes:

- `CRITICAL`
- `HIGH`

No se envía alerta para cada ejecución del monitor. Se usa deduplicación por ambiente y servicio, más cooldown por `ALERT_COOLDOWN_MINUTES`.

## Recuperación

Cuando el monitor vuelve a detectar el servicio saludable, el incidente pasa a `RESOLVED` y se genera alerta de recuperación.

## Seguridad

- No se envían secretos.
- Los destinatarios se registran enmascarados.
- Los textos se sanitizan para ocultar tokens, URLs de base de datos, cookies y claves.
- Las simulaciones solo están permitidas con `APP_ENV=staging`.

## Prueba recomendada

En staging:

1. Entrar como Super Admin.
2. Ir a `Estado del Sistema`.
3. Ejecutar `Simular incidente staging`.
4. Verificar incidente abierto.
5. Verificar correo de alerta si `ALERT_EMAIL` y Resend están configurados.
6. Marcar resuelto.
7. Verificar alerta de recuperación.
