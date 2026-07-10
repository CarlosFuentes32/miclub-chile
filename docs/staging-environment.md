# Ambiente staging de MiClub Chile

Este documento define cómo separar producción y pruebas para que QA no cree, modifique ni elimine datos reales.

## Arquitectura objetivo

| Componente | Producción | Staging |
| --- | --- | --- |
| Rama Git | `main` | `staging` o `develop` |
| Landing | `https://miclubchile.cl` | `https://staging.miclubchile.cl` |
| Cliente | `https://app.miclubchile.cl` | `https://staging-app.miclubchile.cl` |
| Comercio | `https://comercio.miclubchile.cl` | `https://staging-comercio.miclubchile.cl` |
| Cajero | `https://cajero.miclubchile.cl` | `https://staging-cajero.miclubchile.cl` |
| Administrador | `https://admin.miclubchile.cl` | `https://staging-admin.miclubchile.cl` |
| API | `https://api.miclubchile.cl/api` | `https://staging-api.miclubchile.cl/api` |
| PostgreSQL | Base productiva | Base exclusiva staging |
| JWT | Secretos productivos | Secretos staging distintos |
| Email | Remitente productivo | API key/allowlist QA |

Producción y staging no deben compartir `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `RESEND_API_KEY`, credenciales de usuarios, comercios, clientes, transacciones ni recompensas.

## Variables requeridas

Usar `.env.staging.example` como plantilla. No subir `.env.staging` al repositorio.

Variables backend:

- `NODE_ENV=staging`
- `ENVIRONMENT_LABEL=AMBIENTE DE PRUEBAS`
- `STAGING_DATABASE_CONFIRM=miclub-staging`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN_DAYS`
- `CORS_ORIGIN`
- `FRONTEND_URL`
- `CUSTOMER_APP_URL`
- `APP_URL`
- `COMMERCE_APP_URL`
- `CASHIER_APP_URL`
- `ADMIN_APP_URL`
- `API_URL`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `SUPPORT_EMAIL`
- `STAGING_EMAIL_ALLOWLIST`

Variables frontend:

- `VITE_APP_ENV=staging`
- `VITE_ENVIRONMENT_LABEL=AMBIENTE DE PRUEBAS`
- `VITE_API_URL=https://staging-api.miclubchile.cl/api`
- `VITE_CUSTOMER_URL`
- `VITE_COMMERCE_URL`
- `VITE_CASHIER_URL`
- `VITE_ADMIN_URL`

## Protección visual

Todos los frontends muestran una franja superior con el texto `AMBIENTE DE PRUEBAS` cuando `VITE_APP_ENV=staging`. En producción no aparece.

## Seed QA staging

Ejecutar únicamente contra la base staging:

```bash
npm run prisma:migrate:deploy
npm run prisma:seed:staging
```

El seed staging se bloquea si:

- `NODE_ENV` no es `staging`.
- `STAGING_DATABASE_CONFIRM` no es `miclub-staging`.
- `DATABASE_URL` parece apuntar a producción.

Usuarios QA por defecto:

| Rol | Usuario |
| --- | --- |
| Super Administrador | `qa.admin@miclubchile.cl` |
| Comercio | `qa.comercio@miclubchile.cl` |
| Cajero | `qa.cajero@miclubchile.cl` |
| Cliente 1 | `qa.cliente1@miclubchile.cl` |
| Cliente 2 | `qa.cliente2@miclubchile.cl` |

Contraseña: valor de `QA_SEED_PASSWORD` configurado manualmente en staging. No se versiona en Git.

Datos ficticios creados:

- Comercio `QA Comercio Staging` (`qa-comercio-staging`).
- Cajero asociado al comercio QA.
- Dos clientes QA inscritos.
- Programas QA de puntos, sellos y cashback.
- Programa cashback activo.
- Recompensa disponible para `qa.cliente1@miclubchile.cl`.
- Transacción de ejemplo.
- Auditoría `staging_seed_executed`.

## Configuración de despliegue

1. Crear una rama `staging` desde `main`.
2. Crear proyectos Vercel separados para Landing, Cliente, Comercio, Cajero y Administrador.
3. Configurar esos proyectos para desplegar desde la rama `staging` o `develop`.
4. Crear un servicio API separado en Railway para staging.
5. Crear una base PostgreSQL separada en Railway para staging.
6. Configurar las variables de `.env.staging.example` en Vercel/Railway.
7. Ejecutar migraciones sobre la base staging.
8. Ejecutar `npm run prisma:seed:staging`.
9. Validar `/health` en staging y confirmar que devuelve `environment: "staging"`.
10. Ejecutar la suite Playwright con secrets de staging.

GitHub Actions ejecuta la suite E2E en `main`, `staging` y `develop`. Las URLs E2E están protegidas por el guard de Playwright para evitar ejecución contra dominios sin `staging`.

## Evidencia de separación

Antes de aprobar staging:

1. Comparar en Railway que producción y staging tienen servicios y bases PostgreSQL distintos.
2. Confirmar que el hostname/database name de `DATABASE_URL` staging no coincide con producción.
3. Validar `GET https://staging-api.miclubchile.cl/health` y `GET https://staging-api.miclubchile.cl/api/health`.
4. Crear un comercio QA en staging.
5. Buscar ese comercio en producción y confirmar que no existe.
6. Crear/canjear una recompensa QA en staging.
7. Confirmar que la transacción no aparece en producción.

## Ejecución local con ambiente staging

```bash
npm ci
npm run prisma:generate
copy .env.staging.example .env.staging
# completar DATABASE_URL y secretos locales de staging
npm run prisma:migrate:deploy
npm run prisma:seed:staging
npm run dev:api
npm run dev:admin
npm run dev:commerce
npm run dev:cashier
npm run dev:customer
npm run dev:landing
```

## Criterio de cierre

El ambiente staging solo se considera listo cuando:

- Los cinco frontends muestran la franja de pruebas.
- La API staging responde `environment: staging`.
- El seed QA corre contra una base distinta a producción.
- Las operaciones QA realizadas en staging no aparecen en producción.
- Playwright corre contra URLs staging y no contra producción.
