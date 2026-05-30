#!/bin/sh
set -eu

: "${PORT:=8080}"
export PORT

cd /app
mkdir -p api/data/cache api/data/locks api/data/logs api/data/status api/uploads /run/nginx
chown -R www-data:www-data api/data api/uploads 2>/dev/null || true
chmod -R 775 api/data api/uploads 2>/dev/null || true

echo "[start] rendering nginx config for PORT=${PORT}"
envsubst '$PORT' < /app/ops/nginx.conf.template > /etc/nginx/conf.d/default.conf

echo "[start] validating nginx config"
nginx -t

echo "[start] starting php-fpm"
php-fpm -D

echo "[start] starting nginx (listening on ${PORT})"
exec nginx -g 'daemon off;'
