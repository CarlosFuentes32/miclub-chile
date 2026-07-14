# Arquitectura de seguridad Enterprise

Controles principales: JWT corto, refresh HttpOnly rotativo, detección de reuse, sesiones revocables, guards por rol, validación tenant en backend, rate limiting distribuido PostgreSQL, CSRF por Origin/Referer, CORS allowlist, headers de seguridad, auditoría centralizada y errores deduplicados.

Producción y staging deben usar secretos, cookies y orígenes distintos. No se confía en botones ocultos del frontend.
