# Retención de backups externos

Política inicial:

- Diario: 14 días.
- Semanal: 8 semanas.
- Mensual: 6 meses.

RC-B1 ejecuta retención en dry-run por defecto. Producción no puede borrar backups en esta fase.

Reglas:

- Nunca borrar el backup más reciente.
- Nunca borrar backups marcados como protegidos.
- Producción requiere autorización humana antes de eliminación real.

