# Panel Administrador MiClub

`apps/admin` es el panel operativo global, accesible exclusivamente para `MICLUB_ADMIN`.

## Mocks

- métricas globales e ingresos mensuales estimados;
- comercios de distintos rubros, planes, estados y niveles de uso;
- usuarios de distintos roles sin exponer contraseñas;
- planes Start, Business y Enterprise;
- reportes mensuales básicos;
- estructura inicial de tickets;
- rubros, tipos de programa, estados y textos globales.

Los contratos están en `src/types/admin.ts` y las operaciones en `src/services/admin.service.ts`.

## Endpoints pendientes

- `GET /api/admin/dashboard`
- `GET /api/admin/businesses` y `GET /api/admin/businesses/:id`
- `PATCH /api/admin/businesses/:id/status`
- `GET /api/admin/users` y `GET /api/admin/users/:id`
- `PATCH /api/admin/users/:id/status`
- `GET|POST|PATCH /api/admin/plans`
- `GET /api/admin/reports`
- `GET /api/admin/support/tickets`
- `GET|PATCH /api/admin/settings`

Todos deben requerir `MICLUB_ADMIN`, registrar mutaciones en auditoría inmutable y aplicar paginación, filtros y validación en backend.
