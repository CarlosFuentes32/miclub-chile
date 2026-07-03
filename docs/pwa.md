# Instalación PWA v1.1

Cliente, Cajero y Comercio usan manifests separados para conservar nombre e inicio correctos. Cada uno declara iconos 192×192 y 512×512, `display: standalone`, `scope`, `start_url`, colores y service worker generado por `vite-plugin-pwa`.

`packages/ui/src/PwaInstallPrompt.tsx` captura `beforeinstallprompt`, conserva el evento, ejecuta `prompt()` tras interacción, registra el resultado y escucha `appinstalled`. Si no existe evento, muestra instrucciones Android/iOS. `matchMedia('(display-mode: standalone)')` y `navigator.standalone` evitan mostrarlo instalado.

“Más tarde” guarda una marca durante tres días. Reset:

```text
https://app.miclubchile.cl/?reset-pwa-install=1
https://cajero.miclubchile.cl/?reset-pwa-install=1
```

Chrome controla la elegibilidad y no garantiza emitir `beforeinstallprompt`. Producción requiere HTTPS. La comprobación final debe realizarse en Android/Chrome desde los dominios desplegados y en DevTools → Application.
