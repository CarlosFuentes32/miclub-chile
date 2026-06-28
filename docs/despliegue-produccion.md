# Despliegue de producción de MiClub Chile

## Arquitectura

El repositorio debe mantenerse como monorepo. Cada interfaz continúa siendo una aplicación Vite independiente y todas comparten la API NestJS, PostgreSQL y el paquete `@miclub/shared`.

| Servicio | Dominio | Plataforma recomendada |
|---|---|---|
| Landing | `miclub.cl` | Vercel |
| Cliente | `app.miclub.cl` | Vercel |
| Comercio | `comercio.miclub.cl` | Vercel |
| Cajero | `cajero.miclub.cl` | Vercel |
| Administrador | `admin.miclub.cl` | Vercel |
| API | `api.miclub.cl` | Render o Railway |
| PostgreSQL | Interno, sin exposición pública | Render PostgreSQL o Railway PostgreSQL |

## Recursos que se deben contratar o crear

1. Dominio `miclub.cl` en NIC Chile u otro registrador que lo tenga disponible.
2. Una cuenta Vercel. El plan gratuito puede servir para evaluación; revise límites antes del piloto comercial.
3. Un servicio web persistente para NestJS y una base PostgreSQL. En Render se crean desde `render.yaml`; en Railway se puede desplegar `Dockerfile` y agregar PostgreSQL.
4. Opcional: monitoreo de disponibilidad, copias de seguridad y correo transaccional. No son necesarios para validar el flujo inicial, pero sí antes de almacenar datos comerciales críticos.

## Backend en Render

1. Conecte el repositorio `CarlosFuentes32/miclub-chile` a Render.
2. Cree un Blueprint usando `render.yaml`.
3. Cuando Render lo solicite, defina `SEED_PASSWORD` con una contraseña temporal robusta.
4. Complete las variables `PILOT_*` con los datos reales del minimarket.
5. Espere que el pre-deploy ejecute migraciones y el seed.
6. Compruebe `https://URL-RENDER/api/health`.
7. Agregue `api.miclub.cl` como dominio personalizado del servicio.

Variables obligatorias del backend:

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=secreto-aleatorio-largo
JWT_REFRESH_SECRET=otro-secreto-aleatorio-largo
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN_DAYS=7
CORS_ORIGIN=https://miclub.cl,https://app.miclub.cl,https://comercio.miclub.cl,https://cajero.miclub.cl,https://admin.miclub.cl
CUSTOMER_APP_URL=https://app.miclub.cl
SEED_PASSWORD=contraseña-temporal-del-piloto
```

Copie además las variables `PILOT_*` desde `.env.production.example`.

## Alternativa Railway

1. Cree un proyecto desde el repositorio.
2. Agregue PostgreSQL al mismo proyecto.
3. Configure el servicio para construir con `Dockerfile`.
4. Copie `DATABASE_URL` desde PostgreSQL y agregue las demás variables anteriores.
5. Antes del primer arranque ejecute:

```bash
npm run prisma:migrate:deploy
npm run prisma:seed
```

6. Configure `api.miclub.cl` como dominio personalizado.

## Frontends en Vercel

Cree cinco proyectos Vercel apuntando al mismo repositorio. Mantenga la raíz en el directorio del repositorio para que npm resuelva los workspaces.

| Proyecto | Build command | Output directory | Dominio |
|---|---|---|---|
| landing | `npm run build --workspace=@miclub/landing` | `apps/landing/dist` | `miclub.cl` |
| customer | `npm run build --workspace=@miclub/customer` | `apps/customer/dist` | `app.miclub.cl` |
| commerce | `npm run build --workspace=@miclub/commerce` | `apps/commerce/dist` | `comercio.miclub.cl` |
| cashier | `npm run build --workspace=@miclub/cashier` | `apps/cashier/dist` | `cajero.miclub.cl` |
| admin | `npm run build --workspace=@miclub/admin` | `apps/admin/dist` | `admin.miclub.cl` |

En los cuatro paneles configure:

```env
VITE_API_URL=https://api.miclub.cl/api
VITE_CUSTOMER_URL=https://app.miclub.cl
VITE_COMMERCE_URL=https://comercio.miclub.cl
VITE_CASHIER_URL=https://cajero.miclub.cl
VITE_ADMIN_URL=https://admin.miclub.cl
```

Los archivos `vercel.*.json` contienen la misma configuración para despliegues mediante CLI.

## DNS y subdominios

Agregue primero cada dominio en Vercel o en el proveedor del backend. Luego copie exactamente los registros DNS que indique cada plataforma. Normalmente el dominio raíz usa un registro A/ALIAS y los subdominios usan CNAME, pero los valores concretos deben obtenerse del panel del proveedor.

No cambie los nameservers sin verificar antes dónde se administrará definitivamente la zona DNS.

## Prueba del piloto

1. Entre a `admin.miclub.cl` y confirme que el minimarket está activo.
2. Entre a `comercio.miclub.cl`, configure o revise el programa y cree un cajero.
3. Abra el QR de inscripción del comercio y registre un cliente desde `app.miclub.cl`.
4. Inicie sesión como el cliente usando correo o teléfono y muestre su QR.
5. Entre a `cajero.miclub.cl`, escanee el QR o busque los ocho dígitos finales del teléfono.
6. Registre compras hasta completar la meta.
7. Confirme la recompensa en Cliente, canjéela desde Caja y revise el estado utilizado.
8. Verifique las métricas en Comercio y la actividad global en Administrador.

## Comandos de verificación

```powershell
npm.cmd install
npm.cmd run prisma:generate
npm.cmd run prisma:migrate:deploy
npm.cmd run prisma:seed
npm.cmd run build
powershell -ExecutionPolicy Bypass -File scripts/test-mvp.ps1
```
