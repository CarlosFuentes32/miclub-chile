# Flujos v1.1

## Cliente digital

1. QR del comercio abre `https://app.miclubchile.cl/#/join?business=<slug>`.
2. Sin cuenta: registro global y asociación automática.
3. Con cuenta: login, confirmación y creación de `CustomerBusiness`.
4. Si ya existe la relación, se informa sin duplicar.

## Comercio

- Genera link/QR desde Material QR.
- Solo lista y administra clientes asociados a su `businessId`.
- En “Clientes manuales” crea, busca, edita, desactiva o elimina perfiles locales.
- Desactivar una relación no elimina el usuario global ni afecta otros comercios.

## Cajero

- Opera clientes digitales inscritos mediante QR o búsqueda.
- “Clientes manuales / Adulto mayor” permite crear, buscar, sumar el movimiento compatible con el programa y canjear beneficios.
- No puede ver clientes manuales de otro comercio.

## Instalación PWA

El modal aparece en móvil si no está standalone ni aplazado. “Instalar ahora” usa `beforeinstallprompt`; si el navegador no lo entrega, muestra instrucciones manuales. “Más tarde” aplaza tres días. Para reset: `?reset-pwa-install=1` antes del hash.
