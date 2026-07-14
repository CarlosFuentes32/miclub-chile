# Estados de pago

Estados:

- `pending`: registrado, pendiente de revisión.
- `approved`: aprobado por Super Admin o futuro webhook verificado.
- `rejected`: rechazado con motivo.
- `reversed`: reversado administrativamente.
- `refunded`: reservado para proveedor real.
- `failed`: error técnico/proveedor.
- `cancelled`: pago cancelado.

Un pago duplicado se controla con `idempotency_key`.
