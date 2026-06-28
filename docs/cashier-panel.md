# Panel Cajero

`apps/cashier` ofrece una interfaz mobile-first limitada a transacciones, canjes y anulaciones permitidas.

## Flujo rápido

El camino principal es: `Escanear cliente` → lectura automática → `Registrar transacción`. No existe una pantalla de confirmación adicional. El lector QR se carga de forma diferida para mantener livianos el login y el inicio.

## Mocks

`src/data/cashier.mock.ts` define dos clientes de Café Central:

- `+56995026368`: 7 de 10 compras y una recompensa disponible.
- `+56995026369`: 9 de 10 compras, útil para probar el desbloqueo inmediato.

`src/services/cashier.service.ts` simula búsqueda, lectura QR, transacción, canje y anulación. La anulación conserva la transacción, cambia su estado a `cancelled` y agrega un evento a `mockAuditEvents`.

## Endpoints pendientes

- `POST /api/cashier/scan-customer`
- `GET /api/cashier/customers?phone=+569XXXXXXXX`
- `POST /api/cashier/transactions`
- `POST /api/cashier/rewards/:rewardId/redeem`
- `POST /api/cashier/transactions/:transactionId/cancel`

Todos deben validar en backend el rol `CASHIER`, el comercio/sucursal asignado, vigencia de la recompensa, idempotencia y ventana de anulación. El frontend nunca debe ser la autoridad final.
