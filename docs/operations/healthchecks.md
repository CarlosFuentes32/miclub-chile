# Healthchecks Enterprise

MiClub Chile expone tres niveles de healthcheck.

## Liveness

`GET /api/health/live`

Valida que el proceso Node está vivo. Debe ser rápido y no depender de base de datos.

Resultado esperado:

```json
{ "status": "ok" }
```

## Readiness

`GET /api/health/ready`

Valida que el servicio puede recibir tráfico:

- PostgreSQL responde.
- Prisma puede consultar.
- Variables críticas existen.

Si falla devuelve HTTP 503.

## Health Enterprise detallado

`GET /api/health`

Entrega estado completo:

- API.
- Base de datos.
- Prisma.
- Conectividad.
- Railway.
- Vercel.
- Landing.
- Cliente.
- Comercio.
- Cajero.
- Administrador.
- Emails.
- SSL.
- Último deploy.
- Ambiente.
- Commit.
- Versión.
- Fecha de compilación.
- Última ejecución Playwright.
- Runtime y memoria.

## Ambiente

El sistema prioriza `APP_ENV` sobre `NODE_ENV`, porque en plataformas cloud `NODE_ENV` puede ser `production` incluso cuando el despliegue corresponde a staging.
