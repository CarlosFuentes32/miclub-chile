# Runbook: pago duplicado

1. Comparar referencia e idempotency key.
2. No aprobar dos pagos para el mismo periodo sin justificación.
3. Reversar administrativamente el duplicado si fue aprobado.
4. Registrar auditoría y motivo.
