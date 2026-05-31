#!/bin/sh
# MEX Group nginx + PHP-FPM startup script for Railway.
# Railway exposes the public PORT; PHP-FPM stays private on localhost.

: "${PORT:=8080}"
export PORT

# Railway can keep an existing generated domain pointed at an older target
# port. Public users still open the normal HTTPS domain without a port; this
# fallback keeps that domain healthy while Railway config catches up.
EXTRA_LISTEN=""
if [ "$PORT" != "9000" ]; then
  EXTRA_LISTEN="    listen 0.0.0.0:9000;
    listen [::]:9000;"
fi
export EXTRA_LISTEN

cd /app
mkdir -p api/data/cache api/data/locks api/data/logs api/data/status api/uploads /run/nginx /tmp
chown -R www-data:www-data api/data api/uploads 2>/dev/null || true
chmod -R 775 api/data api/uploads 2>/dev/null || true

echo "[start] PORT=${PORT} - rendering nginx config"
envsubst '$PORT $EXTRA_LISTEN' < /app/ops/nginx.conf.template > /tmp/nginx.conf

echo "[start] validating nginx config"
nginx -t -c /tmp/nginx.conf 2>&1 || { echo "[start] FATAL: nginx config invalid"; exit 1; }
grep -n "listen " /tmp/nginx.conf || true

echo "[start] starting php-fpm on 127.0.0.1:9070"
php-fpm -F 2>&1 &
FPM_PID="$!"

sleep 2

if ! kill -0 "$FPM_PID" 2>/dev/null; then
  echo "[start] FATAL: php-fpm exited before nginx could start"
  exit 1
fi

echo "[start] PHP-FPM started, nginx listening on ${PORT} with fallback 9000"
exec nginx -c /tmp/nginx.conf -g 'daemon off;'
