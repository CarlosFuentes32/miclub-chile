# Bitácora MVP Comercial

## 2026-07-11

### Etapa 1 local: reactivación de usuarios

- Rama: `fix/mvp-comercial-readiness`.
- Commit: `8e5f34b Fix user reactivation flow`.
- Resultado: `npm run test:user-reactivation`, pruebas relacionadas, Prisma validate/generate y build completo aprobados localmente.
- Producción: no modificada.

### Readiness operacional

- Se removió el seed automático del predeploy de Render.
- Se agregó bloqueo defensivo para impedir seed demo en `NODE_ENV=production` salvo autorización explícita por variable.
- Se reforzó health check de API para validar conectividad real a PostgreSQL.
- Se actualizó `@nestjs/platform-express`/`multer` mediante `npm audit fix` sin `--force`; auditoría local quedó sin vulnerabilidades conocidas.
- Se agregaron runbooks de monitoreo y backup/restore.

### Pendientes externos

- Crear ambiente staging real en proveedores.
- Configurar variables staging y base PostgreSQL exclusiva.
- Ejecutar migraciones y seed QA solo en staging.
- Ejecutar Playwright contra staging real.
- Configurar monitoreo externo y verificar backups desde proveedor.
