#!/bin/sh
# Ultra-minimal startup — just serve a static PHP response
: "${PORT:=8080}"
export PORT

echo "[ultra-minimal] Starting on PORT=${PORT}"
exec php -S 0.0.0.0:${PORT}
