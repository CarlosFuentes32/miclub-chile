# Configuración email producción

Variables:

- `RESEND_API_KEY`
- `EMAIL_FROM`
- `SUPPORT_EMAIL`
- `APP_URL`
- `NODE_ENV=production`

Requisitos:

- Dominio/remitente verificado.
- API key restringida.
- Prueba inicial solo a correos internos autorizados.
- Links productivos correctos.
- Rate limiting activo.
- Auditoría de eventos críticos.

No enviar campañas ni correos masivos en piloto.
