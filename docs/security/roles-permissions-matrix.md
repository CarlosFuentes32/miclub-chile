# Matriz de roles y permisos

| Rol | Paneles | Acciones permitidas | Prohibido | Alcance |
|---|---|---|---|---|
| SUPER_ADMIN | Admin completo | Operación global, auditoría, seguridad, backups, incidentes | Acciones productivas destructivas sin autorización | Global |
| MICLUB_ADMIN | Admin operativo | Comercios, usuarios, soporte | Super Admin, seguridad avanzada, impersonation | Global limitado |
| BUSINESS_OWNER | Comercio | Programas, recompensas, colaboradores, clientes propios | Otros comercios, admin global | Su comercio |
| BUSINESS_ADMIN | Comercio | Gestión operativa delegada | Billing sensible global, otros comercios | Su comercio |
| CASHIER | Cajero | Buscar cliente, registrar compra, canjear | Panel comercio/admin, otros comercios | Comercio asignado |
| CUSTOMER | Cliente | Perfil, QR, recompensas propias | Datos de otros clientes/comercios privados | Su cuenta |
| Sistema interno | API/Jobs | Monitoreo, auditoría, webhooks validados | Actuar sin firma o token | Servicio |
| Impersonado | Soporte controlado | Lectura/soporte limitado | Exportar, billing, backups, cambios sensibles | Temporal |

La validación fuente está en backend: `JwtAuthGuard`, `RolesGuard`, `BusinessAccessService` y servicios por dominio.
