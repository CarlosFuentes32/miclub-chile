# Estado de publicación del piloto

Verificación realizada el 28 de junio de 2026.

## Vercel

Los cinco frontends están publicados en el plan Hobby y conectados a la rama `main` del repositorio GitHub:

- Landing: https://miclub-chile-landing.vercel.app
- Cliente: https://miclub-chile-customer.vercel.app
- Comercio: https://miclub-chile-commerce.vercel.app
- Cajero: https://miclub-chile-cashier.vercel.app
- Administrador: https://miclub-chile-admin.vercel.app

Se comprobó que todos responden, renderizan su pantalla inicial y no muestran errores de consola evidentes. Los inicios de sesión reales quedarán operativos cuando la API y PostgreSQL estén publicados.

## Dominio en DonWeb

`miclubchile.cl` estaba disponible al momento de la verificación.

- Registro `.cl` por un año: $12.970 CLP, IVA incluido.
- Seguridad Premium agregada por DonWeb: $1.430 CLP.
- Total del pedido pendiente: $14.400 CLP.
- DonWeb incluyó dominios `.online` y `.store` sin costo durante el primer año.

El pedido quedó agregado en `Mis compras`, detenido antes de **IR A PAGAR**. Antes de pagarlo conviene decidir si se mantiene Seguridad Premium; el dominio por sí solo cuesta $12.970.

## Railway

La cuenta quedó conectada con GitHub y ofrece una prueba limitada a 30 días o US$5 de consumo, sin tarjeta. Falta que el titular acepte los Términos de Servicio en la pestaña de Railway. Después se podrá crear:

1. Un proyecto desde `CarlosFuentes32/miclub-chile` usando `backend/api`.
2. Un servicio PostgreSQL dentro del mismo proyecto.
3. Las variables de entorno descritas en `docs/despliegue-produccion.md`.
4. Las migraciones y el seed de demostración.

## Orden de los próximos pasos

1. Revisar el detalle del pedido de DonWeb y pagar solo cuando se autorice.
2. Aceptar los Términos de Servicio de Railway.
3. Desplegar API y PostgreSQL en el trial.
4. Probar login y el flujo completo con la URL temporal de Railway.
5. Comprar el dominio y agregarlo a Cloudflare Free.
6. Crear DNS para `miclubchile.cl`, `app`, `comercio`, `cajero`, `admin` y `api`.
7. Asociar cada dominio a su proyecto de Vercel y `api.miclubchile.cl` a Railway.
