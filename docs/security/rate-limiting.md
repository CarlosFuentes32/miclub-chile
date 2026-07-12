# Rate limiting distribuido

Implementado con tabla PostgreSQL `rate_limit_buckets`. Aplica a login, password reset, registro, refresh, búsquedas sensibles, exportaciones y operaciones críticas. Es distribuido entre instancias porque no usa memoria local. Variables de ambiente pueden ajustar límites.
