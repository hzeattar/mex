@echo off
REM Local test launcher. Loads test env, starts PHP server.
set APP_ENV=local
set APP_DEBUG=1
set DB_DRIVER=sqlite
set DB_SQLITE_PATH=./api/data/test.sqlite
set REAL_CURRENCY=USDT
set DEMO_CURRENCY=USDT_DEMO
set DEMO_START_BALANCE=10000
set ALLOW_GUEST=1
set AUTH_BOOTSTRAP_SCHEMA=1
set AUTO_MIGRATE=1
set NONCRYPTO_SIMULATE=1
set YAHOO_ENABLED=0
set FRANKFURTER_ENABLED=0
set CRYPTO_PROVIDER=binance
set EODHD_API_KEY=
set LOG_ENABLED=0

echo === MEX test launcher ===
echo DB: %DB_SQLITE_PATH%
echo Listening on http://127.0.0.1:8081
echo.
C:\tools\php85\php.exe -S 127.0.0.1:8081 -t .
