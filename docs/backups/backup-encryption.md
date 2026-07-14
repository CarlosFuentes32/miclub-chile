# Cifrado de backups

RC-B1 usa AES-256-GCM con clave de 32 bytes en `BACKUP_ENCRYPTION_KEY`.

Formato recomendado:

```text
base64:<32 bytes aleatorios en base64>
```

El IV es único por backup. El tag de autenticación se guarda separado en un descriptor `.crypto.json`. Si el archivo se altera, el descifrado falla.

Si se pierde la clave, el backup no se puede recuperar.

