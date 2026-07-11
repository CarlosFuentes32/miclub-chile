# Planes, suscripciones y billing

## Diagnóstico actual antes de implementar

- Existía `Plan` con nombre, precio mensual, límites, features y estado `active`.
- `Business` tenía `planId`.
- Existía `MerchantPlanHistory`, pero no se usaba como contrato de suscripción completo.
- Los planes eran principalmente visuales/comerciales.
- No existía control real de vencimientos.
- No existía integración con proveedor de pago.
- No existía lógica automática de suspensión por falta de pago.
- No existían webhooks de pago.

## Modelo implementado

- `Plan`: agrega `currency`, `billingPeriod`, `trialDays` y `status`.
- `BusinessSubscription`: estado, fechas de inicio/trial/vencimiento/gracia/cancelación, proveedor externo, ID externo y último pago.
- `BillingPayment`: pagos internos/proveedor con monto, moneda, estado, periodo, método, referencia e idempotencia.
- `BillingPaymentHistory`: historial de cambios de estado.
- `BillingWebhookEvent`: eventos webhook con proveedor, ID de evento, firma válida, payload y estado.

Estados soportados:

- Suscripción: `trialing`, `active`, `past_due`, `suspended`, `cancelled`, `expired`.
- Pago: `pending`, `approved`, `rejected`, `cancelled`, `refunded`, `failed`.
- Proveedor: `manual`, `mercado_pago`, `flow`.

## Endpoints creados

Admin:

- `GET /api/admin/billing/subscriptions`
- `GET /api/admin/billing/payments`
- `POST /api/admin/billing/payments/manual`
- `PATCH /api/admin/billing/subscriptions/:businessId/plan`
- `POST /api/admin/billing/subscriptions/:businessId/trial`
- `POST /api/admin/billing/subscriptions/:businessId/suspend`
- `POST /api/admin/billing/subscriptions/:businessId/reactivate`
- `POST /api/admin/billing/subscriptions/:businessId/cancel`

Comercio:

- `GET /api/business/billing`
- `POST /api/business/billing/change-request`
- `POST /api/business/billing/cancel-request`

Webhook preparado:

- `POST /api/billing/webhooks/:provider`

## Seguridad

- El frontend no tiene endpoint para aprobar pagos.
- El pago manual solo existe para Super Admin y exige referencia/motivo.
- El pago manual usa `idempotencyKey` para evitar doble registro.
- Los webhooks requieren `BILLING_WEBHOOK_SECRET`; si falta o falla firma, se guardan como `failed` y no procesan pago.
- Los webhooks tienen índice único por proveedor + evento.
- No se guardan números de tarjeta.
- No se agregaron credenciales reales.

## Comportamiento implementado

- Crear comercio crea suscripción inicial según el plan y sus días de prueba.
- Pago manual aprobado activa/renueva suscripción y reactiva comercio.
- Cambio de plan crea historial `MerchantPlanHistory`.
- Suspensión/cancelación no elimina datos.
- Comercio puede solicitar cambio o cancelación, pero no ejecutarlo automáticamente.

## Pendiente para proveedor real

No se conectó producción ni sandbox real. Antes de producción:

1. Definir precios finales.
2. Elegir proveedor oficial: Flow o Mercado Pago Suscripciones.
3. Configurar credenciales sandbox.
4. Implementar consulta API del proveedor para confirmar pago.
5. Procesar webhooks firmados para estados `approved`, `pending`, `rejected`, `refunded`.
6. Probar duplicados/idempotencia.
7. Probar suspensión automática por vencimiento con job programado.

## Propuesta de integración

### Flow

Ventajas: fuerte presencia en Chile, medios locales, buena experiencia CLP. Recomendado si el foco principal es Chile y transferencias/tarjetas locales.

### Mercado Pago Suscripciones

Ventajas: suscripciones y checkout conocidos, ecosistema amplio. Recomendado si se prioriza rapidez comercial y escalabilidad regional.

Mi recomendación inicial: Flow para Chile si los comercios pagarán en CLP y se quiere conciliación local; Mercado Pago si el roadmap contempla expansión regional.

## Variables necesarias

- `BILLING_WEBHOOK_SECRET`
- Futuras: `BILLING_PROVIDER`, `FLOW_API_KEY`, `FLOW_SECRET`, `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`

No ingresar credenciales reales en código ni documentación.

## Pruebas

```powershell
npm.cmd run prisma:generate
npm.cmd run build
npm.cmd run test:billing
```

Después de aplicar la migración en staging, poblar suscripciones para comercios existentes:

```powershell
$env:NODE_ENV="staging"; npm.cmd run billing:backfill
```

El backfill está bloqueado en `NODE_ENV=production` salvo que se habilite explícitamente `ALLOW_BILLING_BACKFILL_PRODUCTION=true` después de revisión manual.

## Ejecución local

```powershell
npm.cmd install
npm.cmd run prisma:generate
npm.cmd run prisma:migrate
npm.cmd run dev:api
npm.cmd run dev:admin
npm.cmd run dev:commerce
```

No declarar pagos reales: esta implementación deja la estructura interna y el control manual auditado; los pagos online requieren proveedor confirmado.
