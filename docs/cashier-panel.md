# Panel Cajero

El panel cajero consume exclusivamente la API real. Permite escanear el JWT temporal del QR del cliente, buscar por los ocho dígitos finales del teléfono, registrar compras, canjear recompensas y anular la última transacción permitida.

Para la instalación local, el seed crea `cashier@miclub.local` y el cliente `customer@miclub.local` con teléfono `+56995026368`. Los datos del piloto productivo se configuran mediante variables `PILOT_CASHIER_*` y `PILOT_CUSTOMER_*`.

El flujo principal no utiliza mocks.
