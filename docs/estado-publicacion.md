# Estado de publicación del piloto

Verificación realizada el 29 de junio de 2026.

## URLs definitivas

- Landing: https://miclubchile.cl
- Acceso único / Cliente: https://app.miclubchile.cl
- Comercio: https://comercio.miclubchile.cl
- Cajero: https://cajero.miclubchile.cl
- Administrador: https://admin.miclubchile.cl
- API: https://api.miclubchile.cl/api
- Salud: https://api.miclubchile.cl/api/health

Los dominios personalizados están asociados en Vercel y Railway. La zona DNS autoritativa permanece en DonWeb (`ns1.donweb.com` y `ns2.donweb.com`).

## Vercel

Los cinco frontends están publicados en el plan Hobby, conectados a `main` y asociados a sus dominios definitivos. Las URLs `*.vercel.app` se conservan únicamente como alias técnicos de Vercel.

## Dominio en DonWeb

`miclubchile.cl` está registrado y activo hasta el 28 de junio de 2027. La zona contiene el A del dominio raíz, los CNAME de todos los portales y los registros CNAME/TXT requeridos por Railway.

## Railway

Railway Hobby mantiene `miclub-api` y `miclub-db` en producción. PostgreSQL, migraciones, seed y el flujo integral del MVP fueron verificados contra la instancia real. La URL temporal de Railway se conserva como alias técnico de recuperación.
