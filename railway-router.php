<?php
declare(strict_types=1);

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$path = is_string($path) ? rawurldecode($path) : '/';
$path = str_replace('\\', '/', $path);
$lower = strtolower($path);

$blockedPrefixes = [
  '/.git',
  '/api/data',
  '/api/uploads',
];

foreach ($blockedPrefixes as $prefix) {
  if ($lower === $prefix || str_starts_with($lower, $prefix . '/')) {
    http_response_code(404);
    echo 'Not found';
    return true;
  }
}

$basename = basename($path);
$allowWellKnown = str_starts_with($lower, '/.well-known/');
if (!$allowWellKnown && str_starts_with($basename, '.')) {
  http_response_code(404);
  echo 'Not found';
  return true;
}

$blockedExtensions = ['.env', '.ini', '.log', '.sql', '.lock', '.bak', '.prepatch', '.orig', '.patch'];
foreach ($blockedExtensions as $ext) {
  if (str_ends_with($lower, $ext)) {
    http_response_code(404);
    echo 'Not found';
    return true;
  }
}

$blockedFiles = ['/dockerfile', '/railway.json', '/railway-router.php', '/readme.md'];
if (in_array($lower, $blockedFiles, true)) {
  http_response_code(404);
  echo 'Not found';
  return true;
}

$file = __DIR__ . $path;
if ($path !== '/' && is_file($file)) {
  return false;
}

return false;
