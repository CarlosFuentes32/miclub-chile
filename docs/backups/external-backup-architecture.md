# Arquitectura de backups externos RC-B1

MiClub Chile usa Railway Hobby, sin backups administrados ni PITR. RC-B1 agrega un backup lógico externo, cifrado y verificable en Cloudflare R2.

Flujo:

1. Validar `BACKUP_ENVIRONMENT`.
2. Validar `DATABASE_URL` sin imprimirla.
3. Confirmar herramientas `pg_dump` y `pg_restore`.
4. Ejecutar `pg_dump --format=custom`.
5. Calcular SHA-256 del dump.
6. Cifrar con AES-256-GCM.
7. Calcular SHA-256 del archivo cifrado.
8. Subir dump cifrado, descriptor criptográfico y metadata segura a R2 privado.
9. Verificar existencia remota.
10. Eliminar temporales.

Los backups no se suben a GitHub Artifacts ni al repositorio.

