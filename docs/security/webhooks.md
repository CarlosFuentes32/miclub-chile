# Webhooks seguros

Billing valida firma HMAC con timestamp, bloquea replay por ventana de 5 minutos, registra idempotencia por proveedor/evento y no procesa pagos reales solo por body. Firma inválida queda auditada y con estado failed.
