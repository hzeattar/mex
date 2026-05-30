#!/bin/sh
# MEX Group — SIMPLE startup for Railway debugging
# Uses PHP built-in server to rule out nginx issues

: "${PORT:=8080}"
export PORT

cd /app

echo "[start-simple] Starting PHP built-in server on PORT=${PORT}"
echo "[start-simple] This is a diagnostic build — if this works, the issue is nginx config"

# Start PHP built-in server (handles .php files, serves static files)
exec php -S 0.0.0.0:${PORT} /app/railway-router.php
