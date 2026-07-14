# Sprint 4 — Logs Enterprise, Auditoría y Trazabilidad

## Objetivo

MiClub Chile registra evidencia operacional para reconstruir acciones críticas sin depender de `console.log` ni de revisar logs dispersos del proveedor.

El sistema responde:

- quién ejecutó una acción;
- qué recurso afectó;
- cuándo ocurrió;
- desde qué request/correlation ID;
- qué endpoint intervino;
- qué resultado tuvo;
- qué versión, commit y build estaban activos;
- qué error produjo una falla;
- qué datos cambiaron antes y después, siempre sanitizados.

## Componentes implementados

### Request ID y Correlation ID

Todas las solicitudes HTTP pasan por `RequestContextMiddleware`.

- Si llega `X-Request-ID` válido, se acepta.
- Si no llega o no cumple formato seguro, se genera uno nuevo.
- Se propaga en la respuesta como `X-Request-ID`.
- Se agrega `X-Correlation-ID` para agrupar operaciones relacionadas.
- Los frontends generan ambos headers desde `packages/shared/src/auth-client.ts`.

### Logs estructurados

`StructuredLoggerService` emite JSON lineal con:

- timestamp;
- nivel;
- ambiente;
- servicio;
- módulo;
- request ID;
- correlation ID;
- método;
- endpoint;
- usuario seguro;
- rol;
- comercio relacionado;
- versión;
- commit;
- build;
- metadata sanitizada.

En producción, `debug` queda deshabilitado por defecto.

### Auditoría centralizada

`AuditService` amplía `audit_logs` con:

- actor;
- rol;
- comercio;
- acción;
- categoría;
- módulo;
- recurso;
- resultado;
- riesgo;
- estado anterior/posterior sanitizado;
- request ID;
- correlation ID;
- endpoint;
- método;
- código HTTP;
- duración;
- IP hasheada;
- user-agent sanitizado;
- versión, commit y build.

El modelo anterior se reutilizó y se amplió mediante migración no destructiva.

### Errores del sistema

`system_errors` agrupa errores iguales mediante fingerprint seguro compuesto por:

- tipo;
- módulo;
- endpoint;
- mensaje sanitizado;
- stack normalizado.

Permite:

- contar ocurrencias;
- ver primera y última aparición;
- buscar por request ID;
- marcar como investigando;
- marcar como resuelto;
- relacionar con incidente.

### Exception Filter global

`EnterpriseExceptionFilter` captura excepciones y devuelve una respuesta segura:

```json
{
  "statusCode": 500,
  "message": "No pudimos completar la operación.",
  "requestId": "...",
  "correlationId": "...",
  "timestamp": "..."
}
```

No expone stack trace, SQL, paths locales, variables, tokens ni secretos.

### Integración con incidentes

Cuando un error 5xx deduplicado supera el umbral de repetición, el sistema puede crear o actualizar un incidente `api-errors` sin generar uno por cada error individual.

### Integración con backups

Los flujos de backup, restore drill y rollback plan registran auditoría:

- `backup_started`;
- `backup_completed`;
- `backup_failed`;
- `restore_drill_validated`;
- `restore_drill_failed`;
- `restore_drill_blocked`;
- `rollback_plan_validated`.

No se registra contenido del backup, credenciales ni rutas sensibles.

## Sanitización

La sanitización central está en:

`backend/api/src/enterprise-logging/sensitive-data.ts`

Nunca deben registrarse:

- contraseñas;
- hashes;
- JWT;
- refresh tokens;
- cookies;
- headers Authorization;
- API keys;
- `DATABASE_URL`;
- webhook secrets;
- RUT completo;
- teléfono completo;
- email completo cuando no sea necesario.

Los datos se redactan, enmascaran o hashean según el caso.

## Panel Super Admin

Se agregaron/ampliaron:

- `Auditoría y trazabilidad`;
- `Errores del sistema`.

La auditoría permite filtrar por:

- usuario;
- rol;
- acción;
- categoría;
- módulo;
- resultado;
- nivel de riesgo;
- request ID;
- correlation ID;
- ambiente;
- código HTTP.

Los errores permiten:

- ver grupos deduplicados;
- buscar por request ID;
- cambiar estado a investigando/resuelto;
- ver ocurrencias, endpoints, commit y ambiente.

## Exportación segura

La exportación de auditoría:

- respeta filtros;
- limita volumen;
- registra quién exporta;
- aplica protección contra CSV injection;
- no incluye payloads sensibles completos.

## Retención

Variables esperadas:

- `LOG_RETENTION_DAYS`;
- `AUDIT_RETENTION_DAYS`;
- `SECURITY_EVENT_RETENTION_DAYS`;
- `ERROR_RETENTION_DAYS`.

Sprint 4 solo implementa política y dry-run. No elimina datos.

Endpoint Super Admin:

`GET /api/admin/audit/retention/dry-run`

## Validación

Ejecutar:

```bash
npm run test:enterprise-logs
npm run prisma:generate
npx prisma validate --schema=database/prisma/schema.prisma
npm run build
```

Para staging:

```bash
npx prisma migrate status --schema=database/prisma/schema.prisma
npm run test:e2e:staging
```

## Interpretación de errores

- `OPEN`: error reciente o pendiente.
- `INVESTIGATING`: error revisado por Super Admin/operación.
- `RESOLVED`: error cerrado operacionalmente.

Si un grupo crece rápidamente, revisar:

1. request ID más reciente;
2. endpoint;
3. commit;
4. status code;
5. incidente relacionado;
6. logs estructurados del mismo correlation ID.

