# Railway production MySQL runbook

This runbook is for moving the Railway deployment from temporary SQLite to the
full VertexPluse MySQL database dump.

## Current expected failure mode

If `/api/ping.php?diag=1` shows:

- `db_driver=sqlite`
- `mysql_env_present=false`
- `placeholder_mysql_config=true`

then Railway is still using placeholder `DB_*` values and user/session data is
not persistent across redeploys.

## 1. Add or link Railway MySQL

In the Railway project, add a MySQL service in the same environment as the PHP
service. Then set the PHP service variables to the real MySQL variables.

Recommended PHP service variables:

```env
APP_ENV=production
APP_DEBUG=0
APP_URL=https://mex-production.up.railway.app
SITE_URL=https://mex-production.up.railway.app

DB_DRIVER=mysql
DB_HOST=${{ MySQL.MYSQLHOST }}
DB_PORT=${{ MySQL.MYSQLPORT }}
DB_NAME=${{ MySQL.MYSQLDATABASE }}
DB_USER=${{ MySQL.MYSQLUSER }}
DB_PASS=${{ MySQL.MYSQLPASSWORD }}
DB_ALLOW_SQLITE_FALLBACK=0
AUTO_MIGRATE=0

PRICE_PROVIDER=yahoo
CRYPTO_PROVIDER=binance
STOCK_QUOTES_PROVIDER=yahoo
ARAB_QUOTES_PROVIDER=yahoo
YAHOO_ALLOW_CHART_QUOTE_FALLBACK=1
NONCRYPTO_SIMULATE=0

ALLOW_SQL_IMPORT=1
ALLOW_SQL_DANGEROUS=0
SQL_IMPORT_MAX_BYTES=67108864
INSTALL_KEY=<strong-random-import-key>
CRON_KEY=<strong-random-cron-key>

ADMIN_EMAIL=admin@vertexpluse.com
ADMIN_PASSWORD=<strong-random-admin-password>
```

Remove placeholder values such as `DB_HOST=localhost`,
`DB_PASS=your_password_here`, and `DB_NAME=mex` from the PHP service.

## 2. Verify MySQL connection

After Railway redeploys, open:

```text
https://mex-production.up.railway.app/api/ping.php?diag=1
```

Expected:

- `db_driver=mysql`
- `mysql_env_present=true`
- `placeholder_mysql_config=false`

## 3. Import the full dump

The importer is locked behind `INSTALL_KEY` and `ALLOW_SQL_IMPORT=1`.
It refuses to run on SQLite, refuses destructive statements by default, and
refuses to import into a non-empty MySQL database unless explicitly confirmed.

Dry run from PowerShell:

```powershell
curl.exe -X POST "https://mex-production.up.railway.app/api/install_import_sql.php?key=$env:INSTALL_KEY&dry_run=1" -F "dump=@C:\Users\AM\Downloads\vertexpluse_meg.sql"
```

Actual import into an empty MySQL database:

```powershell
curl.exe -X POST "https://mex-production.up.railway.app/api/install_import_sql.php?key=$env:INSTALL_KEY" -F "dump=@C:\Users\AM\Downloads\vertexpluse_meg.sql"
```

If the database is not empty, take a Railway backup first. Then rerun with:

```text
confirm_nonempty=1
```

After a successful import, set:

```env
ALLOW_SQL_IMPORT=0
```

## 4. Run safe upgrades/defaults

Run:

```text
https://mex-production.up.railway.app/api/install.php?key=<INSTALL_KEY>
```

Do not pass `reset=1` unless a backup exists and a full reset is intended.

## 5. Create test credentials

Create a normal test user through `/register.php`, or use the auth API after
MySQL is active. Set the admin login only in Railway variables:

```env
ADMIN_EMAIL=admin@vertexpluse.com
ADMIN_PASSWORD=<strong-random-admin-password>
```

## 6. Cron jobs

Create Railway cron jobs or an external cron monitor for:

```text
https://mex-production.up.railway.app/api/cron/quotes_tick.php?key=<CRON_KEY>
https://mex-production.up.railway.app/api/cron/quotes_warm.php?key=<CRON_KEY>
https://mex-production.up.railway.app/api/cron/markets_sync.php?key=<CRON_KEY>
https://mex-production.up.railway.app/api/cron/risk_tick.php?key=<CRON_KEY>
https://mex-production.up.railway.app/api/cron/invest_tick.php?key=<CRON_KEY>
```

Run quote jobs every minute. Risk and invest jobs can run every 1-5 minutes.

## 7. Smoke test

Run:

```powershell
.\ops\railway-smoke.ps1 -Email "client@vertexpluse.com" -Password "<password>"
```

Expected checks:

- `/`, `/login.php`, `/register.php`, and `/app.php` return HTTP 200.
- `/api/ping.php?diag=1` shows MySQL.
- `BTCUSDT` source is Binance.
- `EURUSD`, `XAUUSD`, and `AAPL` return non-zero prices from Yahoo fallback.
- Login, wallet summary, candles, stream, and demo order all work.
