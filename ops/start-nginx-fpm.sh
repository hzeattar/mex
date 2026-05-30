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

# Wait for PHP-FPM to be ready on port 9000 (up to 15 seconds)
echo "[start] waiting for PHP-FPM on 127.0.0.1:9000..."
i=0
while [ $i -lt 15 ]; do
  # Check if PHP-FPM master process is running
  if pgrep -f "php-fpm: master" > /dev/null 2>&1; then
    # Try a FastCGI connection test using PHP CLI
    if php -r "echo 'ok';" > /dev/null 2>&1; then
      echo "[start] PHP-FPM is ready"
      break
    fi
  fi
  i=$((i + 1))
  echo "[start] waiting for PHP-FPM... ($i/15)"
  sleep 1
done

# Quick health check - test DB connectivity (non-blocking)
echo "[start] testing database connectivity..."
php -r "
require_once '/app/api/lib/common.php';
try {
  \$pdo = db();
  echo '[start] DB connection OK (' . db_driver() . ')' . PHP_EOL;
} catch (Throwable \$e) {
  echo '[start] WARNING: DB connection failed: ' . \$e->getMessage() . PHP_EOL;
}
" 2>&1 || echo "[start] WARNING: DB health check failed, continuing anyway — app will handle DB errors gracefully"

echo "[start] starting nginx (listening on ${PORT})"
exec nginx -g 'daemon off;'
