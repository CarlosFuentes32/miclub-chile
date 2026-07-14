# Smoke tests productivos seguros

Los smoke tests productivos no crean, editan ni eliminan datos.

Validan:

- Landing HTTP 200.
- Paneles HTTP 200.
- API health.
- SSL válido.
- Assets principales.
- Rutas protegidas responden 401 sin sesión.
- Commit/versión cuando Enterprise health esté desplegado.

No validan:

- Registro real.
- Compras.
- Canjes.
- Billing.
- Seeds.
- Migraciones.

Comando preparado:

```powershell
npm.cmd run smoke:production
```

El script debe ejecutarse solo después de autorización de smoke productivo no destructivo.
