# Runbook: Disaster Recovery

1. Declarar severidad del incidente.
2. Abrir incidente en Super Admin.
3. Revisar `Estado del Sistema`.
4. Revisar `Backups`.
5. Identificar último commit sano.
6. Identificar último backup verificado.
7. Crear plan de rollback.
8. Restaurar backup en base temporal.
9. Validar integridad.
10. Ejecutar E2E staging.
11. Comunicar estado y tiempos.
12. Ejecutar acciones productivas solo con aprobación explícita.

## Validación posterior

- Health live OK.
- Health ready OK.
- Health detallado sin críticos.
- Login Super Admin, Comercio, Cajero y Cliente.
- Flujo compra/recompensa/canje.
- Auditoría visible.
