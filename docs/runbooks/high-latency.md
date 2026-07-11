# Runbook: alta latencia

1. Revisar tiempos en `Estado del Sistema`.
2. Identificar si la latencia viene de API, frontend, base o email.
3. Revisar logs y métricas de Railway.
4. Revisar queries lentas si el síntoma apunta a PostgreSQL.
5. Verificar consumo de memoria en health detallado.
6. Registrar nota en el incidente.
7. Validar recuperación con el workflow `Staging Monitoring`.
