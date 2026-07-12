# Arquitectura de billing comercial

Sprint 7 deja billing preparado para pilotos pagados por transferencia manual, sin procesar pagos reales por proveedor externo.

Componentes:

- Planes configurables con código interno, precio CLP, periodicidad, trial, gracia, límites, versión y visibilidad.
- Suscripción única principal por comercio.
- Máquina de estados controlada en backend.
- Pagos manuales con registro pendiente y aprobación/rechazo/reversa por Super Admin.
- Historial financiero en `billing_financial_events`.
- Solicitudes comerciales desde panel Comercio en `billing_requests`.
- Proveedor activo inicial: `ManualTransferProvider`.

Regla crítica: el frontend nunca aprueba pagos ni renueva suscripciones. La renovación ocurre solo al aprobar un pago en backend o, en el futuro, por webhook verificado de proveedor real.
