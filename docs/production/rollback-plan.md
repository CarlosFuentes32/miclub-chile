# Plan de rollback productivo

## Código

- Registrar commit anterior productivo.
- Railway: usar rollback/redeploy del deployment anterior.
- Vercel: rollback a deployment anterior por proyecto.
- Git: no usar force push ni reset destructivo.

## Base de datos

La prioridad es migraciones compatibles hacia atrás. Restore real de producción solo se decide si:

- Hay pérdida/corrupción de datos.
- Migración irreversible falló.
- No existe reparación segura.

Antes de restore real:

1. Restaurar snapshot en base temporal.
2. Validar conteos y relaciones.
3. Comunicar ventana.
4. Aceptar posible pérdida entre backup y restore.

## Variables

Guardar snapshot de nombres y estado, nunca valores secretos en Git.

## DNS

No cambiar DNS productivo durante promoción salvo autorización explícita. Si se cambia, registrar TTL y valores previos.

## Gatillos de rollback

- Readiness falla.
- DB falla.
- Login falla.
- 5xx sostenido.
- Canje/recompensas críticas fallan.
- Health obligatorio en error.
- Datos inconsistentes.
