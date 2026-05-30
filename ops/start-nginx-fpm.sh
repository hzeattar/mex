#!/bin/sh
# MEX Group — nginx + PHP-FPM startup script for Railway
# No 'set -e' — container must stay alive even if DB is temporarily down.

: "${PORT:=8080}"
export PORT

cd /app
mkdir -p api/data/cache api/data/locks api/data/logs api/data/status api/uploads /run/nginx /var/log/nginx
chown -R www-data:www-data api/data api/uploads 2>/dev/null || true
chmod -R 775 api/data api/uploads 2>/dev/null || true

echo "[start] rendering nginx config for PORT=${PORT}"
envsubst '$PORT' < /app/ops/nginx.conf.template > /etc/nginx/conf.d/default.conf

# Remove any default site configs that might conflict
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

echo "[start] validating nginx config"
nginx -t 2>&1 || { echo "[start] FATAL: nginx config invalid"; exit 1; }

echo "[start] starting php-fpm"
php-fpm -D 2>&1

# Brief wait for PHP-FPM process to initialize (2 seconds max)
sleep 2

# Verify PHP-FPM is running
if ! pgrep -x php-fpm > /dev/null 2>&1; then
  echo "[start] WARNING: PHP-FPM process not found, retrying..."
  php-fpm -D 2>&1 || true
  sleep 2
fi

echo "[start] PHP-FPM started, nginx starting on PORT=${PORT}"
exec nginx -g 'daemon off;'
