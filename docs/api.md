# API v1.1

Base local: `http://localhost:3000/api`. Producción: `https://api.miclubchile.cl/api`.

## Inscripción multi-comercio

- `GET /public/businesses/:slug`: comercio público del QR.
- `GET /customer/businesses/:slug/membership`: estado de inscripción autenticado.
- `POST /customer/businesses/:slug/join`: crea o reactiva relación; responde conflicto si ya está activo.
- `POST /auth/register`: con `businessSlug` crea usuario y relación en una transacción.

## Clientes manuales

- `POST /manual-customers`
- `GET /manual-customers?business_id=&q=&filter=`
- `GET|PATCH|DELETE /manual-customers/:id?business_id=`
- `POST /manual-customers/:id/movements`
- `POST /manual-customers/:id/redeem`

Todos requieren JWT de miembro activo del comercio. El servicio vuelve a validar `businessId`; conocer un ID ajeno no concede acceso.

## Paneles

- `/business/*`: dashboard, clientes, colaboradores, recompensas y QR.
- `/cashier/*`: búsqueda/escaneo, transacciones, anulaciones y canjes.
- `/admin/*`: administración global.
