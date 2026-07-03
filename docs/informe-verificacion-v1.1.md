# Informe de verificación — v1.1

Fecha: 2026-07-02. Alcance: código local y artefactos compilados. Las URLs públicas requieren que el despliegue y DNS estén activos.

## Datos demo reproducibles

Contraseñas provienen de `SEED_PASSWORD` y `TEST_ACCOUNT_PASSWORD`; los valores por defecto son solo desarrollo.

### Credenciales demo locales

- Administrador general: `http://localhost:5176`, `prueba.admin@miclubchile.cl`, `MiClubPrueba2026!`.
- Comercio A: `http://localhost:5174`, `owner@miclub.local`, `MiClubDemo2026!`.
- Cajero A: `http://localhost:5175`, `cashier@miclub.local`, `MiClubDemo2026!`.
- Comercio B: `http://localhost:5174`, `prueba.comercio@miclubchile.cl`, `MiClubPrueba2026!`.
- Cajero B: `http://localhost:5175`, `prueba.cajero@miclubchile.cl`, `MiClubPrueba2026!`.
- Cliente digital: `http://localhost:5173`, teléfono `95026367`, `MiClubPrueba2026!`.

No publicar estas claves ni usar `SEED_PASSWORD`/`TEST_ACCOUNT_PASSWORD` con estos valores en producción.

### Links QR demo

- Comercio A: `http://localhost:5173/#/join?business=minimarket-piloto`.
- Comercio B: `http://localhost:5173/#/join?business=comercio-prueba-miclub`.
- Producción equivalente: `https://app.miclubchile.cl/#/join?business=<slug>`.

| Actor | Identificador | Comercio |
|---|---|---|
| Admin general | `prueba.admin@miclubchile.cl` | Global |
| Dueño A | `owner@miclub.local` | Minimarket Piloto (`minimarket-piloto`) |
| Cajero A | `cashier@miclub.local` | Minimarket Piloto |
| Dueño B | `prueba.comercio@miclubchile.cl` | Comercio Prueba MiClub (`comercio-prueba-miclub`) |
| Cajero B | `prueba.cajero@miclubchile.cl` | Comercio Prueba MiClub |
| Cliente digital | teléfono `+56995026367` | A y B, un solo `User` |
| Cliente manual | Elena Demo, RUT normalizado `999999999` | Solo A |

## Registro automatizado

| Casos | Evidencia | Resultado |
|---|---|---|
| 1–4 multi-comercio | `npm.cmd run test:multi-commerce` | aprobado |
| 5–10 cliente manual | `npm.cmd run test:manual-customers` | aprobado |
| 11–12 modal PWA móvil | navegador local responsive, Cliente y artefactos Cajero | aprobado; fallback visible |
| 13–14 standalone | manifest `display=standalone`, SW e iconos validados | técnicamente preparado; instalación física requiere Android/HTTPS |
| 15 regresión | build de todos los workspaces y pruebas | aprobado |

## Verificaciones adicionales

- Los seis accesos demo autenticaron con su rol esperado contra la API local.
- Los slugs `minimarket-piloto` y `comercio-prueba-miclub` resolvieron al comercio correcto.
- Consulta real de PostgreSQL: exactamente un `User` para `prueba.cliente@miclubchile.cl` y dos relaciones `CustomerBusiness` (A/B).
- Elena Demo existe únicamente como `ManualCustomer` de Comercio A.
- Navegación responsive de QR A, QR B, Cajero, Comercio y Administrador: cero errores de consola capturados.
- Modal PWA visible en Cliente, Cajero y Comercio; manifests enlazados.
- `miclubchile.cl`, `app`, `cajero`, `comercio`, `admin` y `/health` respondieron HTTP 200 el 2026-07-02.
- `npm.cmd run test:doc-links`: 31 documentos Markdown sin enlaces internos rotos.

## Comandos ejecutados

```powershell
npm.cmd run prisma:generate
npm.cmd run prisma:migrate:deploy
npm.cmd run prisma:seed
npm.cmd run build
npm.cmd run test:multi-commerce
npm.cmd run test:manual-customers
npm.cmd run test:doc-links
```

## Variables requeridas

Producción: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`, `CUSTOMER_APP_URL` y los `VITE_*_URL` documentados en `.env.production.example`. `SEED_PASSWORD` y `TEST_ACCOUNT_PASSWORD` son solo desarrollo/prueba.

No se afirma una instalación física en un teléfono que no estuvo conectado a esta ejecución. Debe completarse el checklist Android de [flujos](flujos-v1.1.md) en el dominio HTTPS desplegado.
