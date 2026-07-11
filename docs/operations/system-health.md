# Estado del Sistema

El módulo **Estado del Sistema** centraliza la salud operativa de MiClub Chile para uso exclusivo del rol `SUPER_ADMIN`.

## Qué muestra

- API.
- Base de datos PostgreSQL.
- Prisma Client.
- Conectividad externa.
- Variables críticas.
- Railway.
- Vercel/frontends.
- Landing.
- Cliente.
- Comercio.
- Cajero.
- Administrador.
- Emails transaccionales.
- SSL.
- Último deploy.
- Ambiente.
- Commit desplegado.
- Versión.
- Fecha de compilación.
- Última ejecución Playwright.

## Endpoints

- Público operativo: `GET /health`.
- API: `GET /api/health`.
- Super Admin: `GET /api/admin/system-status`.

`/api/admin/system-status` requiere JWT válido y rol `SUPER_ADMIN`.

## Interpretación

- `ok`: el componente responde o está correctamente configurado.
- `warning`: el componente no bloquea la operación, pero falta configuración o existe una condición que debe revisarse.
- `error`: el componente falló y puede afectar la operación.
- `unknown`: no hay metadatos suficientes para confirmar el estado.

El estado global será:

- `ok`: no hay errores, warnings ni desconocidos relevantes.
- `degraded`: existe al menos un `warning`, `error` o `unknown`.
- `down`: reservado para una caída completa del servicio.

## Cómo verificar

```bash
curl https://miclub-chile-staging.up.railway.app/api/health
```

En el panel Admin:

1. Iniciar sesión como Super Admin.
2. Abrir **Estado del Sistema**.
3. Revisar semáforos, tiempos de respuesta y metadatos de versión/despliegue.

## Errores comunes

- `database = error`: PostgreSQL no responde o `DATABASE_URL` es inválida.
- `variables = error`: faltan variables críticas como `DATABASE_URL`, `JWT_SECRET` o `JWT_REFRESH_SECRET`.
- `emails = warning`: Resend no está configurado o faltan remitente/soporte.
- `commit = unknown`: el proveedor no está inyectando SHA de commit.
- `playwright = unknown`: no se han configurado variables con la última ejecución E2E.
