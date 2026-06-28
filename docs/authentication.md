# Autenticación y autorización

## Flujo

1. `POST /api/auth/login` valida email, estado y contraseña con bcrypt.
2. La API devuelve un access token de corta duración y escribe el refresh token en una cookie `HttpOnly`.
3. El frontend conserva el access token únicamente en memoria.
4. `POST /api/auth/refresh` rota el refresh token, revoca la sesión anterior y emite un par nuevo.
5. `POST /api/auth/logout` revoca la sesión y elimina la cookie.
6. `GET /api/auth/me` consulta nuevamente al usuario en la base de datos; no confía únicamente en los datos locales.

## Roles

- `CUSTOMER`: aplicación customer.
- `CASHIER`: aplicación cashier.
- `BUSINESS_ADMIN` y `BUSINESS_OWNER`: aplicación commerce.
- `MICLUB_ADMIN`: aplicación admin.

El decorador `@Roles()` y `RolesGuard` son la fuente de autorización para endpoints protegidos. Las comprobaciones frontend solo mejoran la experiencia y nunca reemplazan al backend.

## Endpoints iniciales

- `POST /api/auth/register`: registro público, siempre crea un `CUSTOMER`.
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/users`: ejemplo restringido a `MICLUB_ADMIN`.

En producción deben configurarse HTTPS, secretos independientes y orígenes CORS exactos.
