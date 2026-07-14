# Despliegue de producción de MiClub Chile

## Arquitectura

El repositorio debe mantenerse como monorepo. Cada interfaz continúa siendo una aplicación Vite independiente y todas comparten la API NestJS, PostgreSQL y el paquete `@miclub/shared`.

| Servicio | Dominio | Plataforma recomendada |
|---|---|---|
| Landing | `miclubchile.cl` (`www` redirige al dominio raíz) | Vercel |
| Cliente / login único | `app.miclubchile.cl` | Vercel |
| Comercio | `comercio.miclubchile.cl` | Vercel |
| Cajero | `cajero.miclubchile.cl` | Vercel |
| Administrador | `admin.miclubchile.cl` | Vercel |
| API | `api.miclubchile.cl` | Railway |
| PostgreSQL | Interno, sin exposición pública | Render PostgreSQL o Railway PostgreSQL |

## Recursos que se deben contratar o crear

1. Dominio `miclubchile.cl` en DonWeb.
2. Una cuenta Vercel. El plan gratuito puede servir para evaluación; revise límites antes del piloto comercial.
3. Un servicio web persistente para NestJS y una base PostgreSQL. En Render se crean desde `render.yaml`; en Railway se puede desplegar `Dockerfile` y agregar PostgreSQL.
4. Opcional: monitoreo de disponibilidad, copias de seguridad y correo transaccional. No son necesarios para validar el flujo inicial, pero sí antes de almacenar datos comerciales críticos.

## Backend en Render

1. Conecte el repositorio `CarlosFuentes32/miclub-chile` a Render.
2. Cree un Blueprint usando `render.yaml`.
3. Configure secretos reales de producción y CORS.
4. Espere que el pre-deploy ejecute solo migraciones Prisma.
5. Compruebe `https://URL-RENDER/api/health` y valide `checks.database: "ok"`.
6. Cree usuarios/comercios productivos desde el Panel Administrador o mediante un bootstrap auditado y autorizado.
7. Agregue `api.miclubchile.cl` como dominio personalizado del servicio.

Variables obligatorias del backend:

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=secreto-aleatorio-largo
JWT_REFRESH_SECRET=otro-secreto-aleatorio-largo
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN_DAYS=7
CORS_ORIGIN=https://miclubchile.cl,https://www.miclubchile.cl,https://app.miclubchile.cl,https://comercio.miclubchile.cl,https://cajero.miclubchile.cl,https://admin.miclubchile.cl
CUSTOMER_APP_URL=https://app.miclubchile.cl
FRONTEND_URL=https://miclubchile.cl
APP_URL=https://app.miclubchile.cl
API_URL=https://api.miclubchile.cl/api
```

No configure `SEED_PASSWORD` ni variables `PILOT_*` en producción salvo para una operación excepcional de bootstrap, con respaldo previo y autorización explícita. El seed demo está bloqueado por defecto cuando `NODE_ENV=production`.

## Alternativa Railway

1. Cree un proyecto desde el repositorio.
2. Agregue PostgreSQL al mismo proyecto.
3. Configure el servicio para construir con `Dockerfile`.
4. Copie `DATABASE_URL` desde PostgreSQL y agregue las demás variables anteriores.
5. Antes del primer arranque ejecute:

```bash
npm run prisma:migrate:deploy
```

6. Verifique `/api/health` y confirme `checks.database: "ok"`.
7. Configure `api.miclubchile.cl` como dominio personalizado.

## Frontends en Vercel

Cree cinco proyectos Vercel apuntando al mismo repositorio. Mantenga la raíz en el directorio del repositorio para que npm resuelva los workspaces.

| Proyecto | Build command | Output directory | Dominio |
|---|---|---|---|
| landing | `npm run build --workspace=@miclub/landing` | `apps/landing/dist` | `miclubchile.cl`, `www.miclubchile.cl` |
| customer | `npm run build --workspace=@miclub/customer` | `apps/customer/dist` | `app.miclubchile.cl` |
| commerce | `npm run build --workspace=@miclub/commerce` | `apps/commerce/dist` | `comercio.miclubchile.cl` |
| cashier | `npm run build --workspace=@miclub/cashier` | `apps/cashier/dist` | `cajero.miclubchile.cl` |
| admin | `npm run build --workspace=@miclub/admin` | `apps/admin/dist` | `admin.miclubchile.cl` |

En los cuatro paneles configure:

```env
VITE_API_URL=https://api.miclubchile.cl/api
VITE_CUSTOMER_URL=https://app.miclubchile.cl
VITE_COMMERCE_URL=https://comercio.miclubchile.cl
VITE_CASHIER_URL=https://cajero.miclubchile.cl
VITE_ADMIN_URL=https://admin.miclubchile.cl
```

Los archivos `vercel.*.json` contienen la misma configuración para despliegues mediante CLI.

## DNS y subdominios

Agregue primero cada dominio en Vercel o en el proveedor del backend. Luego copie exactamente los registros DNS que indique cada plataforma. Normalmente el dominio raíz usa un registro A/ALIAS y los subdominios usan CNAME, pero los valores concretos deben obtenerse del panel del proveedor.

No cambie los nameservers sin verificar antes dónde se administrará definitivamente la zona DNS.

## Prueba del piloto

1. Entre a `admin.miclubchile.cl` y confirme que el minimarket está activo.
2. Entre a `comercio.miclubchile.cl`, configure o revise el programa y cree un cajero.
3. Abra el QR de inscripción del comercio y registre un cliente desde `app.miclubchile.cl`.
4. Inicie sesión como el cliente usando correo o teléfono y muestre su QR.
5. Entre a `cajero.miclubchile.cl`, escanee el QR o busque los ocho dígitos finales del teléfono.
6. Registre compras hasta completar la meta.
7. Confirme la recompensa en Cliente, canjéela desde Caja y revise el estado utilizado.
8. Verifique las métricas en Comercio y la actividad global en Administrador.

## Comandos de verificación

```powershell
npm.cmd install
npm.cmd run prisma:generate
npm.cmd run prisma:migrate:deploy
npm.cmd run build
powershell -ExecutionPolicy Bypass -File scripts/test-mvp.ps1
```
