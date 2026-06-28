# Arquitectura inicial

MiClub Chile usa un monorepo npm con cuatro aplicaciones React independientes y una API NestJS.

## Límites de las aplicaciones

- `customer`: experiencia exclusiva para clientes finales.
- `commerce`: configuración y gestión del comercio.
- `cashier`: operación diaria del personal de caja.
- `admin`: administración interna de la plataforma.
- `backend/api`: reglas de negocio, persistencia, seguridad e integraciones.

`packages/ui` puede contener componentes visuales neutrales. `packages/shared` puede contener tipos, constantes y validaciones sin lógica específica de una interfaz. La lógica de dominio permanece en la API.

## Backend

La API expone el prefijo `/api` y comienza con módulos vacíos para `auth`, `users`, `businesses`, `loyalty`, `cycles`, `transactions`, `rewards` y `audit`. La autenticación tiene la infraestructura JWT instalada, pero todavía no implementa registro, inicio de sesión, estrategias ni guards.

## Persistencia

Prisma utiliza PostgreSQL y su esquema vive en `database/prisma/schema.prisma`. Los modelos iniciales son deliberadamente mínimos y deberán evolucionar mediante migraciones versionadas.

## PWA

Cada frontend incluye `vite-plugin-pwa` y un manifiesto independiente. Iconos, estrategia offline, notificaciones y política de caché quedan para una fase posterior.
