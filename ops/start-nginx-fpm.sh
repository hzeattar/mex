#!/bin/sh
# MEX Group — nginx + PHP-FPM startup script for Railway
# IMPORTANT: Do NOT use 'set -e' here! Railway containers must stay alive
# even if the DB health check fails — the app handles DB errors gracefully.

: "${PORT:=8080}"
export PORT

cd /app
mkdir -p api/data/cache api/data/locks api/data/logs api/data/status api/uploads /run/nginx
chown -R www-data:www-data api/data api/uploads 2>/dev/null || true
chmod -R 775 api/data api/uploads 2>/dev/null || true

echo "[start] rendering nginx config for PORT=${PORT}"
envsubst '$PORT' < /app/ops/nginx.conf.template > /etc/nginx/conf.d/default.conf

# Remove any default site configs that might conflict
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

echo "[start] validating nginx config"
nginx -t 2>&1 || { echo "[start] FATAL: nginx config invalid"; exit 1; }

echo "[start] starting php-fpm"
php-fpm -D 2>&1 || { echo "[start] FATAL: php-fpm failed to start"; exit 1; }

# Wait for PHP-FPM to be ready (up to 15 seconds)
echo "[start] waiting for PHP-FPM to accept connections..."
i=0
while [ $i -lt 15 ]; do
  if php -r "echo 'ok';" > /dev/null 2>&1; then
    echo "[start] PHP-FPM is ready"
    break
  fi
  i=$((i + 1))
  echo "[start] waiting for PHP-FPM... ($i/15)"
  sleep 1
done

# Quick DB health check (non-fatal — app handles DB errors gracefully)
echo "[start] testing database connectivity..."
php -r "
require_once '/app/api/lib/common.php';
try {
  \$pdo = db();
  echo '[start] DB connection OK' . PHP_EOL;
} catch (Throwable \$e) {
  echo '[start] WARNING: DB connection failed: ' . \$e->getMessage() . PHP_EOL;
}
" 2>&1 || true

echo "[start] starting nginx (listening on PORT=${PORT})"
exec nginx -g 'daemon off;'
