# Disaster Recovery

Objetivo: recuperar MiClub Chile ante pérdida parcial o total de información con evidencia, validación y control humano.

## Escenarios

### Base corrupta

- Detección: health ready falla, errores Prisma, datos inconsistentes.
- Acción: congelar cambios, crear backup de estado actual, restaurar último backup verificado en base temporal.
- Validación: integridad, conteos, flujos críticos.
- Riesgo: pérdida de últimos eventos si no existe PITR.

### Base eliminada

- Detección: API no ready, proveedor indica base ausente.
- Acción: crear nueva base staging/temporal, restaurar snapshot del proveedor.
- Validación: migraciones y E2E.
- Riesgo: tiempo de recuperación depende del proveedor.

### Deploy fallido

- Detección: health live/ready o Playwright fallan.
- Acción: rollback de código a commit anterior, sin rollback DB destructivo.
- Validación: health, logs, E2E crítico.

### Migración fallida

- Detección: `prisma migrate deploy` falla, API no arranca.
- Acción: no reintentar destructivamente. Restaurar snapshot en base temporal, corregir migración.
- Riesgo: migraciones parcialmente aplicadas.

### Variables dañadas

- Detección: health variables error, auth/email/CORS fallan.
- Acción: restaurar desde inventario del proveedor, nunca desde logs.
- Validación: health ready.

### Railway caído

- Detección: Railway/health inaccesible.
- Acción: monitoreo externo, revisar status provider, preparar despliegue alternativo.
- Riesgo: dependencia del proveedor.

### Error humano

- Detección: auditoría, datos modificados o eliminados.
- Acción: backup inmediato de estado actual, restore temporal del backup previo, comparación.
- Validación: auditoría y relaciones.

## RTO/RPO inicial sugerido

- RTO piloto: 4 horas.
- RPO piloto: 24 horas si solo hay backups diarios.
- Mejorable con PITR/backups más frecuentes.
