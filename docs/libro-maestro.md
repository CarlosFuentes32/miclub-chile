# Libro Maestro — MiClub Chile v1.1

## Identidad y alcance

MiClub Chile v1.1 – Piloto Comercial es una plataforma de fidelización multi-comercio. Una identidad digital global puede participar en muchos comercios; cada relación conserva datos de lealtad independientes. Los clientes sin celular se representan mediante registros manuales privados del comercio y nunca mediante usuarios ficticios.

## Aplicaciones y enlaces oficiales

| Superficie | Producción | Local |
|---|---|---|
| Sitio público | https://miclubchile.cl | http://localhost:5177 |
| Cliente / PWA | https://app.miclubchile.cl | http://localhost:5173 |
| Comercio | https://comercio.miclubchile.cl | http://localhost:5174 |
| Cajero / PWA | https://cajero.miclubchile.cl | http://localhost:5175 |
| Administrador | https://admin.miclubchile.cl | http://localhost:5176 |
| API | https://api.miclubchile.cl/api | http://localhost:3000/api |

Los dominios son objetivos de producción y requieren despliegue/DNS/HTTPS activos. La fuente de verdad de variables está en `.env.production.example`.

## Funcionalidades v1.1

1. **Usuario global multi-comercio:** `User` es único; `CustomerBusiness` vincula usuario y comercio con restricción compuesta. El QR abre `/#/join?business=<slug>`.
2. **Cliente Manual / Adulto Mayor:** `ManualCustomer` y `ManualCustomerMovement` pertenecen a un comercio, admiten búsqueda, movimientos, beneficios, edición y estado sin autenticación del cliente.
3. **PWA:** manifests separados para Cliente, Cajero y Comercio; service worker Workbox; modal `PwaInstallPrompt`; `beforeinstallprompt`, fallback Android/iOS, aplazamiento por tres días y detección standalone.

## Seguridad y privacidad

- JWT corto + refresh token HttpOnly.
- Autorización por rol y membresía de comercio en API.
- Toda consulta comercial incluye `businessId` validado.
- Las credenciales documentadas son exclusivamente demo; producción debe reemplazar secretos y no ejecutar seed demo.

## Operación

Véanse [despliegue](despliegue-produccion.md), [flujos](flujos-v1.1.md), [API](api.md), [base de datos](database.md) e [informe de verificación](informe-verificacion-v1.1.md).
La instalación se detalla en [PWA v1.1](pwa.md) y la evolución en [Roadmap](roadmap.md).
