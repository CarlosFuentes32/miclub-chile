# Panel Comercio

`apps/commerce` implementa una experiencia responsive para dueños y administradores de comercio.

## Mocks incluidos

- dashboard diario y métricas simples;
- configuración de Mercado Barrio;
- programa activo genérico;
- clientes con progreso, recompensas e historial;
- colaboradores `BUSINESS_ADMIN` y `CASHIER`;
- recompensas disponibles, canjeadas, vencidas y canceladas;
- QR, código y link de inscripción.

Los contratos viven en `src/types/commerce.ts` y todas las operaciones pasan por `src/services/commerce.service.ts`.

## Endpoints pendientes

- `GET /api/businesses/me/dashboard`
- `GET|PATCH /api/businesses/me`
- `GET|POST|PATCH /api/businesses/me/loyalty-programs`
- `GET /api/businesses/me/customers`
- `GET /api/businesses/me/customers/:id`
- `GET|POST|PATCH /api/businesses/me/collaborators`
- `GET /api/businesses/me/rewards`
- `GET /api/businesses/me/qr-material`

El backend deberá validar membresía y roles `BUSINESS_OWNER`/`BUSINESS_ADMIN`. Los cajeros no podrán acceder a configuración, reportes o creación de programas.

## Versionado

El MVP presenta un solo programa activo. Los cambios críticos futuros deben crear una versión nueva y conservar la versión asociada a cada ciclo activo para no alterar su progreso histórico.
