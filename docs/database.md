# Base de datos v1.1

PostgreSQL es gestionado con Prisma en `database/prisma/schema.prisma`.

## Identidad digital multi-comercio

- `User`: identidad global única por email y RUT.
- `CustomerBusiness`: relación `customerUserId + businessId`, única y activable/desactivable.
- `Cycle`, `Transaction` y `Reward`: contienen `businessId`; por ello progreso, compras, puntos y beneficios nunca se suman entre comercios.

## Clientes manuales

- `ManualCustomer`: perfil privado por `businessId`, identidad opcional, contadores, progreso y estado.
- `ManualRegistrationReason`: adulto mayor, sin smartphone, sin internet, preferente u otro.
- `ManualCustomerMovement`: sello, compra, puntos o canje, con operador y fecha.
- Unicidad por comercio para `(businessId, rut)` y `(businessId, phone)`.
- No existe relación con `User`, `AuthSession` ni `CustomerBusiness`.

## Migración v1.1

`database/prisma/migrations/202607020001_manual_customers/migration.sql`.
El motivo estructurado se agrega en `202607020002_manual_customer_reason/migration.sql`.

```powershell
npm.cmd run prisma:generate
npm.cmd run prisma:migrate:deploy
```
