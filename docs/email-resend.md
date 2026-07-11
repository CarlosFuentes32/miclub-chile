# Email transaccional con Resend

MiClub Chile envía correos transaccionales desde el backend usando Resend y variables de entorno. No se debe versionar `RESEND_API_KEY` ni tokens reales.

## Variables requeridas

- `RESEND_API_KEY`: API key de Resend. Configurar manualmente en el proveedor.
- `EMAIL_FROM`: remitente verificado, por ejemplo `MiClub Chile <no-reply@miclubchile.cl>`.
- `SUPPORT_EMAIL`: correo visible de soporte.
- `APP_URL`: URL del panel cliente usada en enlaces de recuperación/recompensas.
- `NODE_ENV`: `staging` o `production`.

Variables recomendadas:

- `FRONTEND_URL`: URL pública para cargar el logo.
- `COMMERCE_APP_URL`: enlace al panel comercio.
- `CASHIER_APP_URL`: enlace al panel cajero.
- `ADMIN_APP_URL`: enlace al panel administrador.
- `ADMIN_ALERT_EMAIL`: destinatario QA/admin para avisos administrativos.
- `STAGING_EMAIL_ALLOWLIST`: lista de correos/dominios permitidos fuera de producción.
- `QA_EMAIL_TO`: destinatario QA para el script de envío real en staging.

## Correos implementados

- Recuperación de contraseña.
- Confirmación de cuenta creada.
- Aviso de cambio de contraseña.
- Invitación o creación de colaborador/cajero.
- Recompensa obtenida.
- Recompensa canjeada.
- Suspensión de cuenta.
- Reactivación de cuenta.
- Cambio de estado de comercio.
- Avisos administrativos opcionales a `ADMIN_ALERT_EMAIL`.

## Seguridad

- Los tokens de recuperación se generan con `randomBytes`, se guardan hasheados y expiran a los 30 minutos.
- Cada confirmación marca el token como usado y revoca sesiones activas.
- Antes de generar un nuevo token se invalidan tokens anteriores vigentes del mismo usuario.
- El endpoint de solicitud responde de forma genérica para evitar enumeración de usuarios.
- Hay rate limiting específico para recuperación: 3 solicitudes cada 15 minutos por IP + identificador.
- No se envían contraseñas actuales por correo.
- No se registra `RESEND_API_KEY` ni tokens reales en logs.
- En staging solo se envía a destinatarios permitidos por `STAGING_EMAIL_ALLOWLIST`.

## Pruebas locales

```powershell
npm.cmd run test:email
npm.cmd run test:password-reset
npm.cmd run build
```

Las pruebas cubren:

- Correo enviado correctamente mediante mock de Resend.
- Destinatario fuera de allowlist staging.
- Dirección inválida.
- Proveedor temporalmente caído con reintento seguro.
- Proveedor persistente caído.
- Email inexistente sin enumeración.
- Token expirado.
- Token ya utilizado.
- Token incorrecto.
- Rate limiting de recuperación.
- Invalidación de tokens anteriores.

## Envío real en staging

Configurar manualmente en staging:

```powershell
$env:NODE_ENV="staging"
$env:RESEND_API_KEY="<ingresar manualmente en la terminal o proveedor>"
$env:EMAIL_FROM="MiClub Chile QA <no-reply@miclubchile.cl>"
$env:SUPPORT_EMAIL="soporte@miclubchile.cl"
$env:APP_URL="https://staging-app.miclubchile.cl"
$env:FRONTEND_URL="https://staging.miclubchile.cl"
$env:STAGING_EMAIL_ALLOWLIST="qa@miclubchile.cl,@miclubchile.cl"
$env:QA_EMAIL_TO="qa@miclubchile.cl"
npm.cmd run email:send-qa --workspace=@miclub/api
```

El email no debe considerarse operativo hasta comprobar en staging:

1. Resend devuelve `providerId`.
2. El correo llega a la bandeja QA.
3. El contenido muestra logo, nombre, CTA, soporte y aviso de seguridad.
4. El enlace de recuperación abre staging.
5. El token permite cambiar contraseña una vez.
6. El mismo token falla al reutilizarlo.
7. El token falla al expirar.
8. Un destinatario fuera de allowlist se bloquea en staging.
