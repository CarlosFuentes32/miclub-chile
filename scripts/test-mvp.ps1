param(
  [string]$Api = 'http://localhost:3000/api',
  [string]$Password = $env:SEED_PASSWORD,
  [string]$CashierEmail = 'cashier@miclub.local',
  [string]$OwnerEmail = 'owner@miclub.local',
  [string]$AdminEmail = 'admin@miclub.local',
  [string]$RewardDescription = '$5.000 de descuento'
)
$ErrorActionPreference='Stop'
if (-not $Password) { throw 'Define SEED_PASSWORD antes de ejecutar esta prueba.' }
function Login($identifier){Invoke-RestMethod -Method Post -Uri "$Api/auth/login" -ContentType 'application/json' -Body (@{email=$identifier;password=$Password}|ConvertTo-Json)}
function Headers($session){@{Authorization="Bearer $($session.accessToken)"}}
function Assert($condition,$message){if(-not $condition){throw "FALLO: $message"};Write-Host "OK: $message" -ForegroundColor Green}

$cashier=Login $CashierEmail;$ch=Headers $cashier
$owner=Login $OwnerEmail;$oh=Headers $owner
$admin=Login $AdminEmail;$ah=Headers $admin
Assert ($cashier.user.role -eq 'CASHIER') 'login cajero'

$membership=(Invoke-RestMethod "$Api/business/mine" -Headers $ch)[0];$businessId=$membership.business.id;$businessSlug=$membership.business.slug
$suffix=[DateTimeOffset]::UtcNow.ToUnixTimeSeconds().ToString();$phone='+569'+$suffix.Substring($suffix.Length-8);$customerPassword='ClienteDemo2026!'
$registration=Invoke-RestMethod -Method Post -Uri "$Api/auth/register" -ContentType 'application/json' -Body (@{name='Cliente Piloto';phone=$phone;password=$customerPassword;businessSlug=$businessSlug}|ConvertTo-Json)
Assert ($registration.user.role -eq 'CUSTOMER') 'registro cliente desde QR/comercio'
$customerSession=Invoke-RestMethod -Method Post -Uri "$Api/auth/login" -ContentType 'application/json' -Body (@{email=$phone;password=$customerPassword}|ConvertTo-Json);$cuh=Headers $customerSession
Assert ($customerSession.user.phone -eq $phone) 'login cliente por teléfono'

$customerHome=Invoke-RestMethod "$Api/customer/home" -Headers $cuh
$scanned=Invoke-RestMethod -Method Post -Uri "$Api/cashier/scan-customer" -Headers $ch -ContentType 'application/json' -Body (@{business_id=$businessId;qr_token=$customerHome.qr.token}|ConvertTo-Json)
$customer=$scanned.customer
Assert ($customer.id -eq $registration.user.id) 'escaneo de QR personal'

$search=(Invoke-RestMethod "$Api/cashier/customers/search?phone=$($phone.Substring($phone.Length-8))&business_id=$businessId" -Headers $ch)[0].customer
Assert ($search.id -eq $customer.id) 'búsqueda cliente con prefijo automático'

$program=Invoke-RestMethod -Method Post -Uri "$Api/business/loyalty-programs" -Headers $oh -ContentType 'application/json' -Body (@{business_id=$businessId;name='Piloto 10 compras';accumulation_type='purchase_count';target_value=10;reward_description=$RewardDescription;reward_expiration_days=30}|ConvertTo-Json)
Assert ($program.version -ge 1) 'creación/versionado de programa'

$first=Invoke-RestMethod -Method Post -Uri "$Api/cashier/transactions" -Headers $ch -ContentType 'application/json' -Body (@{business_id=$businessId;customer_user_id=$customer.id}|ConvertTo-Json)
$cancel=Invoke-RestMethod -Method Post -Uri "$Api/cashier/transactions/$($first.transaction_id)/cancel" -Headers $ch
Assert ($cancel.status -eq 'CANCELLED') 'anulación permitida restaura progreso'

$last=$null
1..10|ForEach-Object{$last=Invoke-RestMethod -Method Post -Uri "$Api/cashier/transactions" -Headers $ch -ContentType 'application/json' -Body (@{business_id=$businessId;customer_user_id=$customer.id}|ConvertTo-Json)}
Assert ($last.reward_unlocked -eq $true) 'recompensa generada en transacción 10'
Assert (($last.new_progress -eq 0) -and $last.new_cycle_created) 'nuevo ciclo comienza en 0'

$available=Invoke-RestMethod "$Api/customer/rewards" -Headers $cuh
Assert (@($available|Where-Object status -eq 'AVAILABLE').Count -ge 1) 'cliente ve recompensa disponible'
$redeemed=Invoke-RestMethod -Method Post -Uri "$Api/cashier/rewards/redeem" -Headers $ch -ContentType 'application/json' -Body (@{business_id=$businessId;reward_id=$last.reward_id}|ConvertTo-Json)
Assert ($redeemed.status -eq 'REDEEMED') 'canje de recompensa'
try{Invoke-RestMethod -Method Post -Uri "$Api/cashier/transactions/$($last.transaction_id)/cancel" -Headers $ch;throw 'La anulación debió fallar'}catch{Assert ($_.Exception.Message -notlike '*debió fallar*') 'anulación bloqueada después del canje'}

$customerHome=Invoke-RestMethod "$Api/customer/home" -Headers $cuh
Assert ($customerHome.primary_progress.current_value -eq 0) 'home cliente conectado al ciclo nuevo'
$rewards=Invoke-RestMethod "$Api/customer/rewards" -Headers $cuh
Assert (@($rewards|Where-Object status -eq 'REDEEMED').Count -ge 1) 'cliente ve recompensa utilizada'
$dashboard=Invoke-RestMethod "$Api/business/dashboard?business_id=$businessId" -Headers $oh
Assert ($dashboard.transactions_registered -ge 10) 'dashboard comercio actualizado'
$adminBusinesses=Invoke-RestMethod "$Api/admin/businesses" -Headers $ah
Assert (($adminBusinesses|Where-Object id -eq $businessId).status -eq 'active') 'administrador ve comercio activo'
Write-Host 'PILOTO MVP COMPLETO' -ForegroundColor Cyan
