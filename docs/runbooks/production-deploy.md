# Runbook: production deploy

No ejecutar sin autorización explícita.

1. Confirmar frase `AUTORIZO PROMOCIÓN A PRODUCCIÓN`.
2. Confirmar commit.
3. Confirmar backup.
4. Confirmar restore temporal.
5. Confirmar migraciones revisadas.
6. Desplegar API.
7. Ejecutar migraciones si aplica.
8. Desplegar frontends.
9. Ejecutar smoke tests.
10. Monitorear 24 horas.
