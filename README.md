# MiClub Chile

Base técnica de una plataforma PWA de fidelización para comercios. El repositorio separa las experiencias de clientes, comercios, cajeros y administradores, y centraliza autenticación y autorización en una API NestJS.

Esta fase no incluye funcionalidades finales ni credenciales reales.

## Estructura

```text
mi club/
├── apps/
│   ├── customer/       # React PWA para clientes (puerto 5173)
│   ├── commerce/       # React PWA para comercios (puerto 5174)
│   ├── cashier/        # React PWA para cajeros (puerto 5175)
│   ├── admin/          # React PWA para administración (puerto 5176)
│   └── landing/        # Landing y demo comercial (puerto 5177)
├── backend/
│   └── api/            # API NestJS (puerto 3000)
├── packages/
│   ├── ui/             # Componentes visuales neutrales reutilizables
│   └── shared/         # Tipos y utilidades neutrales compartidas
├── database/
│   └── prisma/         # Esquema y migraciones Prisma
├── docs/               # Arquitectura y próximas fases
├── .env.example
└── package.json
```

## Requisitos

- Node.js 20.19 o superior
- npm 10 o superior
- PostgreSQL 15 o superior

## Instalación

Desde `Desktop/mi club`:

```powershell
npm.cmd install
Copy-Item .env.example .env
```

En macOS o Linux, use `npm` en lugar de `npm.cmd` y `cp .env.example .env`.

Edite `.env` con una URL válida de PostgreSQL y secretos propios. Nunca confirme `.env` al repositorio.

## Base de datos

1. Cree una base PostgreSQL vacía llamada `miclub` (o cambie el nombre en `DATABASE_URL`).
2. Configure `DATABASE_URL` en `.env`.
3. Genere Prisma Client y cree/aplique la migración de autenticación:

```powershell
npm.cmd run prisma:generate
npm.cmd run prisma:migrate:deploy
```

4. Cree los usuarios demo:

```powershell
npm.cmd run prisma:seed
```

Opcionalmente, abra Prisma Studio:

```powershell
npm.cmd run prisma:studio
```

## Ejecutar el backend

```powershell
npm.cmd run dev:api
```

La API queda en `http://localhost:3000/api` y el chequeo inicial en `http://localhost:3000/api/health`.

Endpoints de autenticación: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout` y `GET /api/auth/me`.

## Ejecutar los frontends

Abra una terminal distinta para cada aplicación que necesite:

```powershell
npm.cmd run dev:customer
npm.cmd run dev:commerce
npm.cmd run dev:cashier
npm.cmd run dev:admin
npm.cmd run dev:landing
```

Direcciones locales: customer `http://localhost:5173`, commerce `http://localhost:5174`, cashier `http://localhost:5175`, admin `http://localhost:5176` y landing `http://localhost:5177`.

El Panel Cliente consume home, QR, progreso, recompensas, historial y perfil desde la API real.

El Panel Cajero conecta escaneo QR, búsqueda automática por teléfono, registro rápido, canje y anulación con el backend.

El Panel Comercio conecta dashboard, configuración, asistente de fidelización, clientes, colaboradores, recompensas y material QR.

El Panel Administrador MiClub conecta comercios, usuarios, planes y reportes. Soporte y configuración global continúan como estructura inicial.

## Compilación

```powershell
npm.cmd run build
```

## Usuarios demo

El seed usa la contraseña definida en `SEED_PASSWORD` (`MiClubDemo2026!` en el ejemplo local):

| Portal | Email | Rol |
|---|---|---|
| Admin | `admin@miclub.local` | `MICLUB_ADMIN` |
| Commerce | `owner@miclub.local` | `BUSINESS_OWNER` |
| Cashier | `cashier@miclub.local` | `CASHIER` |
| Customer | `customer@miclub.local` | `CUSTOMER` |

Estas cuentas son exclusivamente locales. Cambie las credenciales para cualquier ambiente compartido.

## Seguridad implementada

Las contraseñas usan bcrypt. El access token dura 15 minutos y se conserva solo en memoria del frontend. El refresh token se almacena hasheado en PostgreSQL y se entrega mediante cookie `HttpOnly`, con rotación y revocación. El backend vuelve a validar estado y rol del usuario. Consulte `docs/authentication.md`.

## Estado y siguiente fase

La autenticación, sesiones y separación por roles están preparadas. Consulte `docs/phase-3.md` para membresías de comercio, administración de usuarios, recuperación de contraseña, pruebas, endurecimiento de seguridad y preparación del futuro dominio de fidelización.

El motor real de ciclos, transacciones, recompensas, canjes y anulaciones está documentado en `docs/loyalty-engine.md`.

## Demo funcional del MVP

Después de configurar PostgreSQL, ejecute:

```powershell
Copy-Item .env.example .env
npm.cmd install
npm.cmd run prisma:generate
npm.cmd run prisma:migrate:deploy
npm.cmd run prisma:seed
npm.cmd run dev:api
```

En terminales separadas:

```powershell
npm.cmd run dev:customer
npm.cmd run dev:cashier
npm.cmd run dev:commerce
npm.cmd run dev:admin
```

Para cambiar la URL de la API, copie `.env.example` dentro de cada aplicación y configure `VITE_API_URL`.

### Credenciales demo

| Perfil | Email | Contraseña | URL |
|---|---|---|---|
| Carlos Demo | `customer@miclub.local` | `MiClubDemo2026!` | `http://localhost:5173` |
| Cajero Demo | `cashier@miclub.local` | `MiClubDemo2026!` | `http://localhost:5175` |
| Dueño Café Central | `owner@miclub.local` | `MiClubDemo2026!` | `http://localhost:5174` |
| Admin MiClub | `admin@miclub.local` | `MiClubDemo2026!` | `http://localhost:5176` |

### Prueba automatizada básica

Con la API ejecutándose y después del seed:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/test-mvp.ps1
```

El script valida login, búsqueda telefónica, creación de programa, transacción, anulación permitida, diez compras, generación y canje de recompensa, anulación rechazada después del canje, home cliente y dashboards.

### Flujo para mostrar a una cafetería

1. Abra Cliente y muestre el QR de Carlos.
2. Abra Caja, busque `95026368` o escanee el QR y registre compras.
3. En la décima compra, muestre la recompensa y el ciclo nuevo en cero.
4. Vuelva a Cliente para mostrar la recompensa disponible.
5. Canjee desde Caja y confirme el estado utilizado en Cliente.
6. Abra Comercio para mostrar dashboard, cliente y recompensa canjeada.
7. Abra Admin para mostrar Café Central, usuarios y actividad global.

## Modo demo comercial sin configuración

El modo demo no necesita PostgreSQL ni backend:

```powershell
npm.cmd install
npm.cmd run dev:landing
```

Abra `http://localhost:5177/demo`. El recorrido usa Café Central, Carlos Demo, progreso inicial 7/10 y la recompensa “1 café a elección”.

Flujo recomendado de presentación:

1. Comience en la landing explicando el problema de recompra.
2. Abra **Ver demo** y complete los cinco pasos guiados.
3. Pregunte qué recompensa usaría la cafetería.
4. Muestre los planes Start y Business.
5. Proponga activar un piloto en menos de 10 minutos.

Material de apoyo: `docs/presentacion-comercial.md`, `docs/guion-venta.md`, `docs/demo-paso-a-paso.md`, `docs/precios.md`, `docs/preguntas-frecuentes.md` y `docs/checklist-lanzamiento.md`.

### Errores comunes

- `P1001`: PostgreSQL no está iniciado o `DATABASE_URL` es incorrecta.
- `401`: la sesión expiró; vuelva a iniciar sesión. Los frontends intentan renovar una vez automáticamente.
- `403`: el usuario no pertenece al comercio, el comercio está suspendido o el rol no corresponde.
- “No tiene programa activo”: ejecute el seed o cree un programa desde Comercio.
- Error CORS: confirme que el puerto frontend esté incluido en `CORS_ORIGIN`.
- Cámara bloqueada: use `localhost`/HTTPS y permita cámara, o ingrese el código manual.
