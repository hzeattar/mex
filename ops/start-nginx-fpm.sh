#!/bin/sh
# MEX Group — nginx + PHP-FPM startup script for Railway
# No 'set -e' — container must stay alive even if DB is temporarily down.

: "${PORT:=8080}"
export PORT

cd /app
mkdir -p api/data/cache api/data/locks api/data/logs api/data/status api/uploads /run/nginx /tmp
chown -R www-data:www-data api/data api/uploads 2>/dev/null || true
chmod -R 775 api/data api/uploads 2>/dev/null || true

echo "[start] rendering nginx config for PORT=${PORT}"
# Render the full nginx.conf (not just a server block)
envsubst '$PORT' < /app/ops/nginx.conf.template > /tmp/nginx.conf

echo "[start] validating nginx config"
nginx -t -c /tmp/nginx.conf 2>&1 || { echo "[start] FATAL: nginx config invalid"; exit 1; }

echo "[start] starting php-fpm"
php-fpm -D 2>&1

# Brief wait for PHP-FPM process to initialize
sleep 2

echo "[start] PHP-FPM started, nginx starting on PORT=${PORT}"
exec nginx -c /tmp/nginx.conf -g 'daemon off;'
