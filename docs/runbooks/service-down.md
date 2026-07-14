# Runbook: servicio caído

1. Revisar `Estado del Sistema` como Super Admin.
2. Confirmar si falla liveness, readiness o health detallado.
3. Revisar logs del servicio en Railway.
4. Revisar último deploy y commit desplegado.
5. Si el fallo comenzó después de un deploy, preparar rollback en staging.
6. Validar base de datos y variables críticas.
7. Actualizar el incidente a `INVESTIGATING`.
8. Cuando se recupere, marcar `RESOLVED` o esperar detección automática.

No tocar producción desde este runbook sin autorización explícita.
