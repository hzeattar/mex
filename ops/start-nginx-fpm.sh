#!/bin/sh
# MEX Group — nginx + PHP-FPM startup script for Railway
# No 'set -e' — container must stay alive even if DB is temporarily down.

# Railway provides PORT automatically. Default to 8080 only for local dev.
: "${PORT:=8080}"
export PORT

cd /app
mkdir -p api/data/cache api/data/locks api/data/logs api/data/status api/uploads /run/nginx /tmp
chown -R www-data:www-data api/data api/uploads 2>/dev/null || true
chmod -R 775 api/data api/uploads 2>/dev/null || true

echo "[start] PORT=${PORT} — rendering nginx config"
envsubst '$PORT' < /app/ops/nginx.conf.template > /tmp/nginx.conf

echo "[start] validating nginx config"
nginx -t -c /tmp/nginx.conf 2>&1 || { echo "[start] FATAL: nginx config invalid"; exit 1; }

echo "[start] starting php-fpm on 127.0.0.1:9000"
php-fpm -F 2>&1 &
FPM_PID="$!"

sleep 2

if ! kill -0 "$FPM_PID" 2>/dev/null; then
  echo "[start] FATAL: php-fpm exited before nginx could start"
  exit 1
fi

echo "[start] PHP-FPM started, nginx starting on PORT=${PORT}"
exec nginx -c /tmp/nginx.conf -g 'daemon off;'
