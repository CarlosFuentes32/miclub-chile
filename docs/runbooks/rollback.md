# Runbook: rollback

## Código

1. Identificar commit sano.
2. Confirmar que existe build previo.
3. Crear backup `PRE_DEPLOY` o `PRE_RESTORE`.
4. Desplegar rollback primero en staging.
5. Ejecutar health y Playwright.

## Migraciones

No revertir migraciones destructivamente sin:

- backup verificado;
- restore temporal validado;
- revisión manual;
- plan de rollback aprobado.

## Variables

Restaurar desde proveedor. No usar logs ni repositorio como fuente de secretos.

## Producción

Rollback productivo requiere autorización humana explícita.
