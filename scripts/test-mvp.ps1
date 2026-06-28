param([string]$Api = 'http://localhost:3000/api', [string]$Password = 'MiClubDemo2026!')
$ErrorActionPreference = 'Stop'
function Login($email) { Invoke-RestMethod -Method Post -Uri "$Api/auth/login" -ContentType 'application/json' -Body (@{email=$email;password=$Password}|ConvertTo-Json) }
function Headers($session) { @{Authorization="Bearer $($session.accessToken)"} }
function Assert($condition,$message) { if(-not $condition){throw "FALLO: $message"};Write-Host "OK: $message" -ForegroundColor Green }

$cashier=Login 'cashier@miclub.local';$ch=Headers $cashier
$owner=Login 'owner@miclub.local';$oh=Headers $owner
$customerSession=Login 'customer@miclub.local';$cuh=Headers $customerSession
$admin=Login 'admin@miclub.local';$ah=Headers $admin
Assert ($cashier.user.role -eq 'CASHIER') 'login cajero'

$membership=(Invoke-RestMethod "$Api/business/mine" -Headers $ch)[0];$businessId=$membership.business.id
$customer=(Invoke-RestMethod "$Api/cashier/customers/search?phone=95026368&business_id=$businessId" -Headers $ch)[0].customer
Assert ($customer.name -eq 'Carlos Demo') 'búsqueda cliente con prefijo automático'

$program=Invoke-RestMethod -Method Post -Uri "$Api/business/loyalty-programs" -Headers $oh -ContentType 'application/json' -Body (@{business_id=$businessId;name='Demo 10 compras';accumulation_type='purchase_count';target_value=10;reward_description='1 café a elección';reward_expiration_days=30}|ConvertTo-Json)
Assert ($program.version -ge 1) 'creación/versionado de programa'

$first=Invoke-RestMethod -Method Post -Uri "$Api/cashier/transactions" -Headers $ch -ContentType 'application/json' -Body (@{business_id=$businessId;customer_user_id=$customer.id}|ConvertTo-Json)
$cancel=Invoke-RestMethod -Method Post -Uri "$Api/cashier/transactions/$($first.transaction_id)/cancel" -Headers $ch
Assert ($cancel.status -eq 'CANCELLED') 'anulación permitida restaura progreso'

$last=$null
1..10|ForEach-Object{$last=Invoke-RestMethod -Method Post -Uri "$Api/cashier/transactions" -Headers $ch -ContentType 'application/json' -Body (@{business_id=$businessId;customer_user_id=$customer.id}|ConvertTo-Json)}
Assert ($last.reward_unlocked -eq $true) 'recompensa generada en transacción 10'
Assert (($last.new_progress -eq 0) -and $last.new_cycle_created) 'nuevo ciclo comienza en 0'

$redeemed=Invoke-RestMethod -Method Post -Uri "$Api/cashier/rewards/redeem" -Headers $ch -ContentType 'application/json' -Body (@{business_id=$businessId;reward_id=$last.reward_id}|ConvertTo-Json)
Assert ($redeemed.status -eq 'REDEEMED') 'canje de recompensa'
try { Invoke-RestMethod -Method Post -Uri "$Api/cashier/transactions/$($last.transaction_id)/cancel" -Headers $ch; throw 'La anulación debió fallar' } catch { Assert ($_.Exception.Message -notlike '*debió fallar*') 'anulación bloqueada después del canje' }

$customerHome=Invoke-RestMethod "$Api/customer/home" -Headers $cuh
Assert ($customerHome.primary_progress.current_value -eq 0) 'home cliente conectado al ciclo nuevo'
$rewards=Invoke-RestMethod "$Api/customer/rewards" -Headers $cuh
Assert (($rewards|Where-Object status -eq 'REDEEMED').Count -ge 1) 'cliente ve recompensa utilizada'
$dashboard=Invoke-RestMethod "$Api/business/dashboard?business_id=$businessId" -Headers $oh
Assert ($dashboard.transactions_registered -ge 10) 'dashboard comercio actualizado'
$adminDashboard=Invoke-RestMethod "$Api/admin/dashboard" -Headers $ah
Assert ($adminDashboard.activeBusinesses -ge 1) 'dashboard admin conectado'
Write-Host 'DEMO MVP COMPLETA' -ForegroundColor Cyan
