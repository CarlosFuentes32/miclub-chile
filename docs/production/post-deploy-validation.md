# Validación post-deploy

## API

1. `GET /api/health/live`.
2. `GET /api/health/ready`.
3. `GET /api/health`.
4. Confirmar commit, ambiente, build time.
5. Confirmar DB y Prisma OK.

## Paneles

1. Landing carga.
2. Cliente carga.
3. Comercio carga.
4. Cajero carga.
5. Administrador carga.
6. Assets sin 404.
7. Consola sin errores críticos.

## Seguridad

1. Ruta protegida sin token devuelve 401.
2. Login QA autorizado funciona.
3. Roles no cruzan paneles.
4. Cookies/JWT correctos.

## Producto

Validar con cuenta QA productiva autorizada:

- Admin: dashboard y system status.
- Comercio: programa/recompensas/billing.
- Cajero: búsqueda no destructiva.
- Cliente: perfil/QR/historial.

## Logs

Revisar errores 5xx, system errors, incidentes y auditoría durante 30 minutos posteriores.
