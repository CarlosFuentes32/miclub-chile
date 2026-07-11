# Runbook: base de datos no disponible

1. Revisar `/api/health/ready`.
2. Confirmar error en checks `database` y `prisma`.
3. Revisar estado del servicio PostgreSQL staging.
4. Confirmar que `DATABASE_URL` corresponde a staging.
5. Revisar límites de conexión y disponibilidad del proveedor.
6. No ejecutar migraciones destructivas.
7. No aplicar seeds sobre producción.
8. Una vez recuperada la base, ejecutar nuevamente readiness.
