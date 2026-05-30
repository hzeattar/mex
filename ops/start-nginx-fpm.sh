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

# Wait for PHP-FPM to be ready (up to 10 seconds)
echo "[start] waiting for PHP-FPM on port 9000..."
i=0
while [ $i -lt 10 ]; do
  if php-fpm -t 2>/dev/null; then
    # Check if FPM socket is accepting connections
    if curl -s --max-time 1 http://127.0.0.1:9000 2>/dev/null || nc -z 127.0.0.1 9000 2>/dev/null; then
      echo "[start] PHP-FPM is ready"
      break
    fi
  fi
  i=$((i + 1))
  echo "[start] waiting for PHP-FPM... ($i/10)"
  sleep 1
done

# Quick health check - test DB connectivity
echo "[start] testing database connectivity..."
php -r "
require_once '/app/api/lib/common.php';
try {
  \$pdo = db();
  echo '[start] DB connection OK (' . db_driver() . ')' . PHP_EOL;
} catch (Throwable \$e) {
  echo '[start] WARNING: DB connection failed: ' . \$e->getMessage() . PHP_EOL;
}
" 2>/dev/null || echo "[start] WARNING: DB health check failed, continuing anyway"

echo "[start] starting nginx (listening on ${PORT})"
exec nginx -g 'daemon off;'
