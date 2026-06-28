# Motor real de fidelización

El backend es la única fuente de verdad para progreso, ciclos y recompensas. `LoyaltyEngineService` ejecuta cada transacción dentro de una transacción PostgreSQL `Serializable`.

## Reglas implementadas

- creación automática de `CustomerBusiness` y ciclo activo;
- acumulación por compras, visitas, monto o puntos;
- cierre del ciclo al alcanzar la meta, sin trasladar sobrantes;
- recompensa disponible con vencimiento opcional;
- ciclo siguiente en cero;
- canje con validación de comercio y estado;
- anulación exclusiva de la última transacción válida;
- restauración del progreso mediante `previous_value`;
- rechazo de anulación si la recompensa ya fue canjeada;
- auditoría para programas, ciclos, transacciones y recompensas.

La migración agrega índices parciales PostgreSQL para garantizar un solo programa activo por comercio y un solo ciclo activo por cliente/comercio.

## Preparación

```powershell
Copy-Item .env.example .env
npm.cmd install
npm.cmd run prisma:generate
npm.cmd run prisma:migrate:deploy
npm.cmd run prisma:seed
npm.cmd run dev:api
```

El seed restablece los ciclos, transacciones, recompensas y auditorías de Café Central para que la prueba comience en cero.

## Endpoints disponibles

- `GET /api/business/mine`
- `POST /api/business/loyalty-programs`
- `GET /api/business/loyalty-programs/active`
- `GET /api/business/dashboard`
- `POST /api/cashier/scan-customer`
- `GET /api/cashier/customers/search`
- `POST /api/cashier/transactions`
- `POST /api/cashier/transactions/:id/cancel`
- `POST /api/cashier/rewards/redeem`
- `GET /api/customer/home`
- `GET /api/customer/rewards`
- `GET /api/customer/history`

## Prueba completa en PowerShell

```powershell
$api = 'http://localhost:3000/api'
$password = 'MiClubDemo2026!'

$cashierLogin = Invoke-RestMethod -Method Post -Uri "$api/auth/login" -ContentType 'application/json' -Body (@{ email='cashier@miclub.local'; password=$password } | ConvertTo-Json)
$cashierHeaders = @{ Authorization = "Bearer $($cashierLogin.accessToken)" }
$membership = (Invoke-RestMethod -Uri "$api/business/mine" -Headers $cashierHeaders)[0]
$businessId = $membership.business.id
$customer = (Invoke-RestMethod -Uri "$api/cashier/customers/search?phone=95026368&business_id=$businessId" -Headers $cashierHeaders)[0]

1..9 | ForEach-Object {
  Invoke-RestMethod -Method Post -Uri "$api/cashier/transactions" -Headers $cashierHeaders -ContentType 'application/json' -Body (@{ business_id=$businessId; customer_user_id=$customer.id } | ConvertTo-Json)
}

$customerLogin = Invoke-RestMethod -Method Post -Uri "$api/auth/login" -ContentType 'application/json' -Body (@{ email='customer@miclub.local'; password=$password } | ConvertTo-Json)
$customerHeaders = @{ Authorization = "Bearer $($customerLogin.accessToken)" }
Invoke-RestMethod -Uri "$api/customer/home" -Headers $customerHeaders
$transaction10 = Invoke-RestMethod -Method Post -Uri "$api/cashier/transactions" -Headers $cashierHeaders -ContentType 'application/json' -Body (@{ business_id=$businessId; customer_user_id=$customer.id } | ConvertTo-Json)
$transaction10

Invoke-RestMethod -Method Post -Uri "$api/cashier/rewards/redeem" -Headers $cashierHeaders -ContentType 'application/json' -Body (@{ business_id=$businessId; reward_id=$transaction10.reward_id } | ConvertTo-Json)

Invoke-RestMethod -Uri "$api/customer/home" -Headers $customerHeaders
Invoke-RestMethod -Uri "$api/customer/rewards" -Headers $customerHeaders
Invoke-RestMethod -Uri "$api/customer/history" -Headers $customerHeaders

$ownerLogin = Invoke-RestMethod -Method Post -Uri "$api/auth/login" -ContentType 'application/json' -Body (@{ email='owner@miclub.local'; password=$password } | ConvertTo-Json)
$ownerHeaders = @{ Authorization = "Bearer $($ownerLogin.accessToken)" }
Invoke-RestMethod -Uri "$api/business/dashboard?business_id=$businessId" -Headers $ownerHeaders
```

Después de nueve operaciones, `GET /customer/home` muestra 9/10. La décima respuesta contiene `reward_unlocked: true`, `new_progress: 0`, `new_cycle_created: true` y `reward_id`.
