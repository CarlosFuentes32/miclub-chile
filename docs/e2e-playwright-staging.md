# Suite E2E Playwright para MiClub Chile

La suite E2E está diseñada para ejecutarse exclusivamente contra staging. La configuración bloquea dominios productivos y exige `E2E_ENV=staging`.

## Cobertura implementada

- Administrador:
  - Login válido.
  - Login inválido.
  - Crear comercio QA.
  - Validación y edición/borrado de RUT.
  - Editar comercio.
  - Suspender comercio.
  - Reactivar comercio.
  - Eliminar comercio.
  - Eliminar usuario.
  - Reactivar usuario.
- Comercio:
  - Login.
  - Crear programa de puntos.
  - Crear programa de sellos.
  - Crear programa cashback.
  - Activar programa explícitamente.
  - Crear recompensa.
  - Ver recompensa disponible.
  - Crear colaborador/cajero.
- Cajero:
  - Login vía API.
  - Buscar cliente por teléfono.
  - Buscar cliente inexistente.
  - Registrar compra.
  - Generar sellos.
  - Generar puntos.
  - Generar cashback por monto.
  - Obtener recompensa.
  - Canjear recompensa.
  - Evitar doble canje.
  - Anular operación cuando corresponde.
- Cliente:
  - Registro QA.
  - Validaciones UI de nombre, teléfono, correo y contraseña.
  - Login.
  - Recuperación de contraseña sin enumeración de usuario.
  - Inscripción a segundo comercio.
  - Visualización de múltiples comercios.
  - QR personal.
  - Historial.
  - Recompensas.
  - Edición de perfil.
- Seguridad:
  - Cliente intentando entrar a administrador.
  - Cajero intentando entrar a comercio.
  - Comercio intentando entrar a administrador.
  - Ruta protegida sin token.
  - Token inválido/vencido.
  - Usuario suspendido.
  - Usuario eliminado.
  - Usuario reactivado.
- Billing:
  - Suscripción creada al crear comercio.
  - Pago manual auditado.
  - Idempotencia de pago manual.
  - Reactivación por pago manual.
  - Webhook firmado.
  - Idempotencia de webhook.

## Datos QA

Las pruebas crean datos identificables con prefijo `QA` y dominios `qa.miclubchile.cl`. Cada test genera identificadores únicos y al finalizar intenta limpiar lógicamente los comercios creados por la propia suite.

La suite no debe utilizar datos reales ni credenciales productivas.

## Variables/secrets requeridos

Configurar como GitHub Secrets:

- `E2E_API_URL`
- `E2E_ADMIN_URL`
- `E2E_COMMERCE_URL`
- `E2E_CASHIER_URL`
- `E2E_CUSTOMER_URL`
- `E2E_ADMIN_EMAIL`
- `E2E_ADMIN_PASSWORD`
- `E2E_DEFAULT_PASSWORD`
- `E2E_BILLING_WEBHOOK_SECRET`

`E2E_BILLING_WEBHOOK_SECRET` debe coincidir con `BILLING_WEBHOOK_SECRET` del backend de staging.

## Bloqueo contra producción

`tests/e2e/support/env.ts` falla si:

- `E2E_ENV` no es `staging`.
- Alguna URL apunta a dominios productivos de MiClub Chile.
- Algún host no contiene `staging` y tampoco corresponde a un preview Vercel aislado de MiClub (`*.vercel.app` con `mi-club-chile`).

## Ejecución local

```powershell
Copy-Item .env.e2e.example .env.e2e.local
# completar valores staging reales, sin subir el archivo
npm.cmd ci
npx.cmd playwright install --with-deps chromium
$env:E2E_ENV="staging"
$env:E2E_API_URL="https://api-staging..."
$env:E2E_ADMIN_URL="https://admin-staging..."
$env:E2E_COMMERCE_URL="https://comercio-staging..."
$env:E2E_CASHIER_URL="https://cajero-staging..."
$env:E2E_CUSTOMER_URL="https://app-staging..."
$env:E2E_ADMIN_EMAIL="..."
$env:E2E_ADMIN_PASSWORD="..."
$env:E2E_DEFAULT_PASSWORD="..."
$env:E2E_BILLING_WEBHOOK_SECRET="..."
npm.cmd run test:e2e:staging
```

Reporte:

```powershell
npm.cmd run test:e2e:report
```

## GitHub Actions

Workflow: `.github/workflows/e2e-staging.yml`

- Ejecuta `npm ci`.
- Instala Chromium con dependencias.
- Compila workspaces.
- Ejecuta `npm run test:e2e:staging`.
- Sube reporte HTML como artefacto.
- Sube traces, screenshots y videos en fallos.
- Falla el pipeline si falla un flujo crítico.

`deploy-pages.yml` depende del workflow E2E, por lo que un fallo E2E bloquea el despliegue de Pages.
