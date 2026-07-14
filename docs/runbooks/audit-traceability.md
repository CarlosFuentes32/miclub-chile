# Runbook — Auditoría y trazabilidad

## Buscar una operación crítica

1. Entrar al Panel Administrador como Super Admin.
2. Abrir `Auditoría`.
3. Filtrar por `Request ID` si existe.
4. Si no existe, filtrar por usuario, acción, módulo o rango de fecha.
5. Abrir el detalle.
6. Revisar:
   - actor;
   - rol;
   - comercio;
   - estado anterior;
   - estado posterior;
   - endpoint;
   - versión;
   - commit.

## Investigar un error

1. Abrir `Errores del sistema`.
2. Filtrar por estado `OPEN`.
3. Ordenar por última aparición y ocurrencias.
4. Abrir detalle.
5. Copiar `Request ID`.
6. Buscar el mismo `Request ID` en Auditoría.
7. Si hay múltiples 5xx repetidos, revisar si se generó incidente.
8. Marcar como `INVESTIGATING`.
9. Registrar nota interna.
10. Cerrar como `RESOLVED` solo después de validar recuperación.

## Exportar auditoría

1. Aplicar filtros mínimos necesarios.
2. Presionar `Exportar CSV seguro`.
3. Confirmar cantidad de filas.
4. La exportación queda auditada como `audit_exported`.

No exportar rangos masivos sin motivo operacional.

## Retención

1. Abrir Auditoría.
2. Ejecutar `Retención dry-run`.
3. Confirmar fechas elegibles.
4. No ejecutar eliminación real sin autorización separada.

## Respuesta segura ante usuario

Si un usuario reporta error, solicitar:

- hora aproximada;
- panel usado;
- acción realizada;
- request ID visible si lo tiene.

No pedir contraseñas ni tokens.

