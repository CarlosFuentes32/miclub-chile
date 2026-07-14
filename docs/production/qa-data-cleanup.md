# Limpieza QA productiva

Primera etapa: inventario dry-run. No eliminar nada.

Buscar:

- Emails con qa/test/prueba/demo/example.
- Comercios QA.
- Teléfonos ficticios.
- RUT de prueba.
- Programas/recompensas/transacciones QA.
- Tickets/incidentes QA.
- Billing QA.

Scripts existentes:

```powershell
npm.cmd run audit:qa-prod
npm.cmd run audit:qa-dry-run-cleanup
```

La eliminación real requiere autorización separada.
