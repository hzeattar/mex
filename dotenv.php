<?php
declare(strict_types=1);

/**
 * Minimal .env loader for shared hosting (Hostinger hPanel).
 * Loads key=value pairs from project root .env into getenv()/$_ENV.
 */
function load_dotenv(?string $path = null): void {
  static $loaded = false;
  if ($loaded) return;
  $loaded = true;

  $root = __DIR__; // project root (this file is at repo root for shared hosting compat)
  $file = $path ?: ($root . '/.env');
  if (!is_file($file) || !is_readable($file)) return;

  $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
  if (!$lines) return;

  foreach ($lines as $line) {
    $line = trim($line);
    if ($line === '' || str_starts_with($line, '#')) continue;
    $pos = strpos($line, '=');
    if ($pos === false) continue;
    $key = trim(substr($line, 0, $pos));
    $val = trim(substr($line, $pos + 1));
    if ($key === '') continue;

    // Strip surrounding quotes
    if ((str_starts_with($val, '"') && str_ends_with($val, '"')) ||
        (str_starts_with($val, "'") && str_ends_with($val, "'"))) {
      $val = substr($val, 1, -1);
    }
    if (getenv($key) === false) {
      putenv($key . '=' . $val);
      $_ENV[$key] = $val;
    }
  }
}
