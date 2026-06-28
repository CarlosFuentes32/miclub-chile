# Panel Cliente PWA

La aplicación `apps/customer` implementa una experiencia mobile-first con splash breve, bienvenida, acceso, registro, inicio, QR, recompensas, historial y perfil.

## Datos mock

`src/data/customer.mock.ts` contiene temporalmente:

- progreso de Café Central (7 de 10 compras);
- próxima recompensa;
- recompensas disponibles, utilizadas y vencidas;
- historial reciente de compras, puntos y canjes.

La UI consume contratos TypeScript definidos en `src/types/customer.ts`. `src/services/customer.service.ts` delimita la futura integración y evita introducir llamadas de red en los componentes visuales.

## Endpoints pendientes

- `GET /api/customer/dashboard`: programa principal, progreso y resumen.
- `GET /api/customer/rewards`: recompensas agrupadas por estado.
- `GET /api/customer/history`: actividad paginada.
- `GET /api/customer/qr`: credencial QR firmada y de corta duración.
- `PATCH /api/users/me`: actualización del perfil propio.
- Ajustar `POST /api/auth/register` para aceptar correo opcional y definir acceso alternativo por teléfono.

El QR actual contiene un identificador mock y un código de respaldo derivado. No debe utilizarse para transacciones reales hasta que el backend emita y valide credenciales firmadas, rotativas y con vencimiento.
