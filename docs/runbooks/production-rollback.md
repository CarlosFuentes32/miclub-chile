# Runbook: production rollback

1. Declarar incidente.
2. Pausar cambios.
3. Identificar último deployment sano.
4. Revertir frontends si aplica.
5. Revertir API si aplica.
6. Evaluar DB: no restaurar producción sin decisión humana.
7. Validar health.
8. Ejecutar smoke tests.
9. Cerrar incidente con postmortem.
