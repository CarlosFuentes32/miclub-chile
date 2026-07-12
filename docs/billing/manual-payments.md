# Pagos manuales

El flujo de transferencia manual es:

1. Super Admin registra referencia, monto, comercio, plan, periodo y motivo.
2. El pago queda `pending`.
3. Super Admin revisa evidencia administrativa fuera del sistema.
4. Si corresponde, aprueba el pago.
5. Solo al aprobar, la suscripción se activa o renueva.

No se guardan comprobantes adjuntos en este Sprint porque no existe almacenamiento privado configurado. Se registra referencia de transferencia.
