# Restore Enterprise

La restauración segura de MiClub Chile nunca debe aplicarse directamente sobre producción.

## Política

1. Seleccionar backup verificado.
2. Restaurar primero sobre base temporal.
3. Validar integridad.
4. Revisar usuarios, comercios, clientes, programas, recompensas, transacciones, auditoría y migraciones.
5. Documentar resultado.
6. Solicitar aprobación humana antes de tocar producción.

## Estados

- `REQUESTED`
- `VALIDATING`
- `VALIDATED`
- `FAILED`
- `BLOCKED`

## Bloqueos

El backend bloquea restauración directa a `production`. Si se solicita, crea un registro `BLOCKED` con nota de seguridad.

## Validación mínima

- Tablas críticas existen.
- Conteos disponibles.
- Relaciones principales sin huérfanos.
- Migraciones con `finished_at`.
- Checksum lógico generado.

## Restauración temporal

La API registra restore drills con `confirmedTemporaryRestore=true`. Este flujo valida el proceso sin sobrescribir datos reales.
