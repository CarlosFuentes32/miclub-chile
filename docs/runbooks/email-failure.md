# Runbook: falla de emails

1. Revisar check `Emails`.
2. Confirmar `RESEND_API_KEY`, `EMAIL_FROM` y `SUPPORT_EMAIL` en staging.
3. Revisar allowlist de staging.
4. Confirmar estado del proveedor Resend.
5. No imprimir API keys ni tokens en logs.
6. Ejecutar una prueba QA controlada.
7. Registrar incidente si afecta recuperación de contraseña, invitaciones o alertas críticas.
