# Interfaz BillingProvider

El contrato `BillingProvider` desacopla el core de billing de proveedores externos.

Implementaciones previstas:

- `ManualTransferProvider` activo para pilotos.
- `MercadoPagoProvider` futuro.
- `FlowProvider` futuro.

No existe integración real de pagos online en Sprint 7. Cualquier proveedor real debe validarse en sandbox con firma, raw body, timestamp, idempotencia y eventos duplicados.
