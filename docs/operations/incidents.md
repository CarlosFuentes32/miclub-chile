# Historial de incidentes

El historial de incidentes registra fallos operacionales detectados por monitores externos o simulaciones seguras de staging.

## Modelo

Tablas:

- `incidents`
- `incident_actions`
- `incident_alerts`

Estados:

- `DETECTED`
- `INVESTIGATING`
- `IDENTIFIED`
- `MONITORING`
- `RESOLVED`

Severidades:

- `CRITICAL`
- `HIGH`
- `MEDIUM`

## Deduplicación

El sistema usa `dedupeKey = ambiente:servicio`. Si un servicio ya tiene un incidente abierto, el monitor actualiza el incidente existente en vez de crear duplicados.

## Auditoría operacional

Cada incidente registra acciones:

- creación por monitor;
- cambio de estado;
- nota manual;
- alerta enviada;
- alerta suprimida por cooldown;
- recuperación detectada.

## Panel Super Admin

Ruta: `#/system-status`.

Permite ver:

- incidentes abiertos;
- incidentes resueltos recientes;
- últimas alertas;
- últimas acciones;
- commit y versión asociados;
- simulación segura de staging;
- cierre manual controlado.

## Retención

Variable propuesta: `INCIDENT_RETENTION_DAYS`.

El Sprint 2 deja el dato listo para operación. La purga automática debe implementarse en un job posterior, nunca con eliminación manual sin respaldo.
