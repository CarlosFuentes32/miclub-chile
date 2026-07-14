# Arquitectura de Soporte Enterprise

El módulo de soporte opera sobre `/support/*` y está separado de los endpoints de Super Admin. El rol `SUPPORT` puede diagnosticar, crear tickets, consultar fichas 360 y ejecutar herramientas seguras con ticket activo.

No puede eliminar usuarios/comercios, administrar billing, backups, roles, variables ni exportaciones globales.

Componentes:

- Backend: `SupportModule`, `SupportController`, `SupportService`.
- Datos: tickets, notas internas, timeline, SLA, macros y base de conocimiento.
- Frontend: panel `Soporte Enterprise` dentro de Admin, con navegación aislada para rol SUPPORT.
- Auditoría: cada consulta sensible y herramienta registra evento.

