# Preparación de servicios del piloto

Revisión realizada el 28 de junio de 2026. Los precios y disponibilidades pueden cambiar y deben confirmarse nuevamente antes de pagar.

## Dominio

Consulta directa en NIC Chile:

- `miclub.cl`: inscrito por otra persona o entidad.
- `miclubchile.cl`: disponible al momento de la consulta.
- `miclubapp.cl`: disponible al momento de la consulta.

Tarifa NIC Chile mostrada: $9.990 CLP por un año, exenta de IVA. No se inició compra ni pago.

Recomendación: elegir primero `miclubchile.cl`. Antes de comprar, revisar titular, datos de facturación y período de cobertura.

## Cloudflare

Cuenta gratuita creada mediante Google con `carlosgfuentesrojas@gmail.com`. No se agregó dominio y no se cambiaron nameservers ni registros DNS.

Pendiente después de comprar el dominio:

1. Agregar el dominio a Cloudflare.
2. Elegir el plan Free.
3. Copiar los dos nameservers entregados por Cloudflare.
4. Reemplazar los nameservers en NIC Chile.
5. Crear los registros indicados por Vercel y por el proveedor de la API.

## Vercel

El plan Hobby figura como gratuito. Pro aparece desde US$20 mensuales más consumo adicional.

La autorización de la cuenta GitHub quedó pendiente porque el botón de autorización apareció deshabilitado. Después de autorizar manualmente:

1. Importar `CarlosFuentes32/miclub-chile` cinco veces.
2. Crear proyectos `miclub-landing`, `miclub-customer`, `miclub-commerce`, `miclub-cashier` y `miclub-admin`.
3. Usar los comandos y directorios de salida descritos en `despliegue-produccion.md`.
4. Copiar las variables `VITE_*` de cada `.env.production.example`.
5. No asociar dominios hasta decidir y comprar el nombre definitivo.

## Railway

Precios mostrados:

- Trial: 30 días con US$5 de crédito, sin tarjeta.
- Free después del trial: US$1 mensual, hasta 0,5 GB RAM; no incluye dominio personalizado después del trial.
- Hobby: mínimo US$5 mensuales, incluye US$5 de crédito de consumo y dominios personalizados.
- Pro: mínimo US$20 mensuales.

La autorización GitHub quedó pendiente por el mismo bloqueo del botón de autorización. Para un piloto con `api.<dominio>`, Railway Hobby es la alternativa más simple si el consumo de API y PostgreSQL cabe dentro del crédito incluido.

## Render como alternativa

Precios mostrados:

- Workspace Hobby: US$0 más cómputo.
- Web service Free: US$0, 512 MB RAM y 0,1 CPU.
- Web service Starter: US$7 mensuales.
- PostgreSQL Free: US$0, pero con límite de 30 días.
- PostgreSQL Basic 256 MB: US$6 mensuales.

Para un piloto persistente, Render costaría aproximadamente US$6/mes usando API Free y PostgreSQL Basic, o US$13/mes con API Starter y PostgreSQL Basic. El repositorio incluye `render.yaml`.

## Correos corporativos

Google Workspace mostró para un usuario y compromiso anual:

- Business Starter: promoción de $5.200 CLP por usuario/mes; precio original mostrado $6.500.
- Business Standard: promoción de $10.400; precio original $13.000.
- Business Plus: promoción de $16.160; precio original $20.200.

No se inició prueba ni contratación. Para comenzar basta una licencia Business Starter y configurar `contacto@`, usando `ventas@` y `soporte@` como alias si las necesidades operativas lo permiten.

## Orden recomendado

1. Comprar `miclubchile.cl` por un año.
2. Agregarlo a Cloudflare Free y cambiar nameservers.
3. Completar autorización de GitHub en Vercel y Railway.
4. Desplegar API y PostgreSQL en Railway Trial.
5. Probar el flujo completo usando el dominio temporal de Railway.
6. Si funciona, autorizar Railway Hobby y configurar `api.miclubchile.cl`.
7. Desplegar los cinco frontends en Vercel Hobby y asociar dominio/subdominios.
8. Contratar Google Workspace solo después de estabilizar DNS.
