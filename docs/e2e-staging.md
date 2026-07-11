# Suite E2E Staging

La suite Playwright de MiClub Chile está diseñada para ejecutarse únicamente contra staging. El archivo `playwright.config.ts` bloquea cualquier ejecución si las URLs corresponden a producción o si `E2E_ENV` no es `staging`.

## Variables requeridas

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
- `E2E_VERCEL_BYPASS_SECRET` (solo para previews protegidos por Vercel)

Todas las URLs deben apuntar a dominios staging o previews aislados de Vercel de MiClub (`*.vercel.app` con `mi-club-chile`). No usar dominios productivos `miclubchile.cl`.
Si los previews de Vercel tienen Deployment Protection activo, `E2E_VERCEL_BYPASS_SECRET` debe venir de Protection Bypass for Automation y guardarse solo como secreto.

## Ejecución local

```powershell
$env:E2E_ENV="staging"
$env:E2E_API_URL="https://staging-api.miclubchile.cl/api"
$env:E2E_ADMIN_URL="https://staging-admin.miclubchile.cl"
$env:E2E_COMMERCE_URL="https://staging-comercio.miclubchile.cl"
$env:E2E_CASHIER_URL="https://staging-cajero.miclubchile.cl"
$env:E2E_CUSTOMER_URL="https://staging-app.miclubchile.cl"
$env:E2E_ADMIN_EMAIL="qa.admin@miclubchile.cl"
$env:E2E_ADMIN_PASSWORD="***"
$env:E2E_DEFAULT_PASSWORD="***"
$env:E2E_BILLING_WEBHOOK_SECRET="***"
$env:E2E_VERCEL_BYPASS_SECRET="***" # si aplica
npm ci
npx playwright install chromium
npm run test:e2e:staging
```

## Reportes

- HTML: `playwright-report`
- JUnit: `test-results/e2e-junit.xml`
- Traces, screenshots y videos: `test-results/playwright-artifacts`

En GitHub Actions se suben como artefactos `playwright-html-report` y `playwright-artifacts`.

## Cobertura actual

- Administrador: login válido/inválido, crear comercio, RUT editable, editar comercio, suspender/reactivar comercio, eliminar/reactivar usuario.
- Comercio: login, programas puntos/sellos/cashback, activación, recompensa disponible, colaborador/cajero.
- Cajero: login por API, búsqueda cliente, búsqueda inexistente, registrar transacción, generar recompensa, canjear, evitar doble canje, anular.
- Cliente: registro, validaciones UI, login por API, recuperación, inscripción segundo comercio, múltiples comercios, QR, historial, recompensas, perfil.
- Seguridad: acceso sin token, roles cruzados, token inválido, usuario suspendido/eliminado/reactivado.

## Reglas de seguridad

- Los datos creados usan prefijo `QA`.
- No se usan datos reales.
- No se guardan contraseñas ni secrets en el repositorio.
- Si la suite detecta producción, falla antes de ejecutar pruebas.
