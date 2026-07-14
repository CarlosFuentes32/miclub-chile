# Runbook de monitoreo

## Checks obligatorios

- API: `GET /api/health`.
- Base de datos: `checks.database` debe ser `ok`.
- Dominios: landing, cliente, comercio, cajero, administrador y API deben responder con SSL válido.
- Errores: revisar logs del backend y errores de frontend después de cada despliegue.

## Alertas mínimas para piloto

- API no responde o responde distinto de `status: "ok"`.
- `checks.database: "error"`.
- Errores 5xx repetidos.
- Latencia sostenida mayor a 2 segundos en API.
- Fallo de deploy.
- Fallo de GitHub Actions E2E staging.

## Frecuencia recomendada

- Uptime: cada 1 a 5 minutos.
- Revisión manual post-deploy: inmediata.
- Revisión semanal: logs, costos, backups y errores de usuarios.

## Herramientas sugeridas

- Railway/Vercel logs para diagnóstico inicial.
- UptimeRobot, Better Stack o equivalente para monitoreo externo.
- GitHub Actions para bloqueo de regresiones.

No se deben publicar secretos, tokens ni cadenas de conexión en sistemas de monitoreo.
