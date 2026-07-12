# Seguridad de billing

Controles:

- Solo Super Admin puede aprobar, rechazar o reversar pagos.
- Soporte consulta billing, pero no modifica estados financieros.
- Comercio solo ve su suscripción y crea solicitudes.
- Exportaciones requieren motivo.
- CSV protege contra injection prefijando valores peligrosos.
- No se guardan tarjetas ni credenciales de proveedor.
- Webhooks usan firma e idempotencia.
