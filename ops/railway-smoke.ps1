param(
  [string]$BaseUrl = "https://mex-production.up.railway.app",
  [string]$Email = "",
  [string]$Password = "",
  [switch]$CreateUser
)

$ErrorActionPreference = "Stop"
$BaseUrl = $BaseUrl.TrimEnd("/")
$Session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

function Assert-Ok($Condition, $Message) {
  if (-not $Condition) { throw $Message }
}

function Invoke-Json($Method, $Path, $Body = $null, $Headers = @{}) {
  $uri = "$BaseUrl$Path"
  $params = @{
    Method = $Method
    Uri = $uri
    WebSession = $Session
    Headers = $Headers
    TimeoutSec = 45
  }
  if ($null -ne $Body) {
    $params["ContentType"] = "application/json"
    $params["Body"] = ($Body | ConvertTo-Json -Depth 10)
  }
  Invoke-RestMethod @params
}

function Test-Page($Path) {
  $resp = Invoke-WebRequest -Method GET -Uri "$BaseUrl$Path" -WebSession $Session -UseBasicParsing -TimeoutSec 45
  Assert-Ok (($resp.StatusCode -ge 200) -and ($resp.StatusCode -lt 400)) "$Path returned $($resp.StatusCode)"
  Write-Host "[ok] $Path => $($resp.StatusCode)"
}

function Test-Quote($Symbol, $Type, $ExpectedSourcePart = "") {
  $encoded = [uri]::EscapeDataString($Symbol)
  $resp = Invoke-Json "GET" "/api/quotes.php?symbols=$encoded&type=$Type&fresh=1&direct=1&strict_live=1&purpose=focus"
  Assert-Ok $resp.ok "quote $Symbol failed"
  $items = @($resp.items)
  Assert-Ok ($items.Count -gt 0) "quote $Symbol returned no items"
  $item = $items[0]
  Assert-Ok ([double]$item.price -gt 0) "quote $Symbol returned invalid price"
  if ($ExpectedSourcePart -ne "") {
    $src = [string]$item.source
    Assert-Ok ($src.ToLower().Contains($ExpectedSourcePart.ToLower())) "quote $Symbol source was '$src', expected '$ExpectedSourcePart'"
  }
  Write-Host "[ok] quote $Symbol => $($item.price) source=$($item.source)"
}

Write-Host "Smoke testing $BaseUrl"

Test-Page "/"
Test-Page "/login.php"
Test-Page "/register.php"
Test-Page "/app.php"

$diag = Invoke-Json "GET" "/api/ping.php?diag=1"
Assert-Ok $diag.ok "ping failed"
Write-Host "[ok] ping db_driver=$($diag.runtime.db_driver) mysql_env_present=$($diag.runtime.mysql_env_present)"
Assert-Ok ($diag.runtime.db_driver -eq "mysql") "Production should use MySQL, but db_driver=$($diag.runtime.db_driver)"

Test-Quote "BTCUSDT" "crypto" "binance"
Test-Quote "EURUSD" "forex"
Test-Quote "XAUUSD" "commodities"
Test-Quote "AAPL" "stocks"

if ($Email -eq "" -or $Password -eq "") {
  Write-Host "[skip] auth flow: pass -Email and -Password to test login, wallet, candles, stream, and demo order"
  exit 0
}

if ($CreateUser) {
  try {
    Invoke-Json "POST" "/api/auth/register.php" @{
      first_name = "Smoke"
      last_name = "User"
      email = $Email
      password = $Password
      lang = "en"
    } | Out-Null
    Write-Host "[ok] registered $Email"
  } catch {
    Write-Host "[info] register skipped or already exists: $($_.Exception.Message)"
  }
}

$login = Invoke-Json "POST" "/api/auth/login.php" @{ email = $Email; password = $Password }
Assert-Ok $login.ok "login failed"
Assert-Ok ([string]$login.token -ne "") "login returned no API token"
$authHeaders = @{ Authorization = "Bearer $($login.token)" }
Write-Host "[ok] login user_id=$($login.user.id)"

$me = Invoke-Json "GET" "/api/auth/me.php" $null $authHeaders
Assert-Ok $me.ok "auth/me failed"
Write-Host "[ok] auth/me"

$wallet = Invoke-Json "GET" "/api/wallet/summary.php" $null $authHeaders
Assert-Ok $wallet.ok "wallet summary failed"
Write-Host "[ok] wallet demo=$($wallet.demo.balance) real=$($wallet.real.balance)"

$candles = Invoke-Json "GET" "/api/trade/candles.php?symbol=BTCUSDT&type=crypto&market=spot&tf=1m&limit=50" $null $authHeaders
Assert-Ok $candles.ok "candles failed"
Assert-Ok (@($candles.items).Count -gt 0) "candles returned no items"
Write-Host "[ok] candles count=$(@($candles.items).Count) source=$($candles.source)"

$stream = Invoke-Json "GET" "/api/trade/stream.php?symbol=BTCUSDT&type=crypto&market=spot" $null $authHeaders
Assert-Ok $stream.ok "trade stream failed"
Write-Host "[ok] stream"

$order = Invoke-Json "POST" "/api/trade/place_order.php" @{
  symbol = "BTCUSDT"
  asset_type = "crypto"
  market_type = "spot"
  side = "BUY"
  order_type = "MARKET"
  usd = 25
  mode = "demo"
} $authHeaders
Assert-Ok $order.ok "demo order failed"
Write-Host "[ok] demo order placed"

$portfolio = Invoke-Json "GET" "/api/trade/portfolio.php?mode=demo" $null $authHeaders
Assert-Ok $portfolio.ok "portfolio failed"
Write-Host "[ok] portfolio"

Write-Host "Smoke test finished successfully."
