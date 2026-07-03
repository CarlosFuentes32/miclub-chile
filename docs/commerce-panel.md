# Manual — Panel Comercio

Acceso: https://comercio.miclubchile.cl. Local: http://localhost:5174.

- Dashboard, programa versionado, clientes, colaboradores, recompensas, Material QR y ajustes consumen API real.
- Material QR genera `https://app.miclubchile.cl/#/join?business=<slug>`.
- “Clientes” administra la relación local; desactivar no borra `User` ni afecta otros comercios.
- “Clientes manuales” crea y administra perfiles exclusivos del comercio, con filtros, duplicados por RUT/teléfono, progreso, historial y beneficios.
- Dueño/administrador solo puede acceder a su comercio mediante `BusinessAccessService`.
