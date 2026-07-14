# Cloudflare R2 para backups MiClub

Bucket recomendado: `miclub-chile-backups`.

Configuración requerida:

- Acceso público deshabilitado.
- Sin dominio público.
- Sin `r2.dev` público.
- Credenciales S3 de mínimo privilegio limitadas al bucket.

Secrets requeridos:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_ENDPOINT`
- `R2_REGION`
- `BACKUP_ENCRYPTION_KEY`

Nunca registrar ni versionar valores reales.

