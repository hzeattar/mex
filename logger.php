<?php
declare(strict_types=1);

/**
 * Tiny shared-hosting friendly logger + status snapshots.
 * - Writes to /api/data/logs/<channel>.log
 * - Rotation by size
 * - Status snapshots in /api/data/status/<name>.json
 */

function tp_logs_dir(): string {
  $dir = __DIR__ . '/../data/logs';
  if (!is_dir($dir)) {
    @mkdir($dir, 0775, true);
  }
  if (!is_dir($dir) || !is_writable($dir)) {
    $dir = rtrim(sys_get_temp_dir(), '/\\') . '/tp_logs';
    if (!is_dir($dir)) @mkdir($dir, 0775, true);
  }
  return $dir;
}

function tp_status_dir(): string {
  $dir = __DIR__ . '/../data/status';
  if (!is_dir($dir)) {
    @mkdir($dir, 0775, true);
  }
  if (!is_dir($dir) || !is_writable($dir)) {
    $dir = rtrim(sys_get_temp_dir(), '/\\') . '/tp_status';
    if (!is_dir($dir)) @mkdir($dir, 0775, true);
  }
  return $dir;
}

function tp_log_level_value(string $lvl): int {
  $lvl = strtoupper(trim($lvl));
  return match($lvl) {
    'DEBUG' => 10,
    'INFO'  => 20,
    'WARN', 'WARNING' => 30,
    'ERROR' => 40,
    'FATAL' => 50,
    default => 20,
  };
}

function tp_log_enabled(): bool {
  try {
    $v = function_exists('env') ? (string)env('LOG_ENABLED', '1') : (string)(getenv('LOG_ENABLED') ?: '1');
  } catch (Throwable $e) {
    $v = (string)(getenv('LOG_ENABLED') ?: '1');
  }
  $v = strtolower(trim($v));
  return !in_array($v, ['0','false','off','no'], true);
}

function tp_log_min_level(): int {
  try {
    $lvl = function_exists('env') ? (string)env('LOG_LEVEL', 'INFO') : (string)(getenv('LOG_LEVEL') ?: 'INFO');
  } catch (Throwable $e) {
    $lvl = (string)(getenv('LOG_LEVEL') ?: 'INFO');
  }
  return tp_log_level_value($lvl);
}

function tp_log_path(string $channel): string {
  $channel = strtolower(trim($channel));
  $channel = preg_replace('/[^a-z0-9_.-]/', '_', $channel);
  if ($channel === '') $channel = 'app';
  return rtrim(tp_logs_dir(), '/\\') . '/' . $channel . '.log';
}

function tp_log_rotate_if_needed(string $path): void {
  $max = 0;
  try {
    $max = (int)(function_exists('env') ? env('LOG_MAX_BYTES', '2097152') : (getenv('LOG_MAX_BYTES') ?: '2097152'));
  } catch (Throwable $e) {
    $max = (int)(getenv('LOG_MAX_BYTES') ?: '2097152');
  }
  $max = max(256000, min(20 * 1024 * 1024, $max));

  if (!is_file($path)) return;
  $sz = (int)@filesize($path);
  if ($sz <= 0 || $sz < $max) return;

  // Keep 3 rotated files: .1 .2 .3
  for ($i = 3; $i >= 1; $i--) {
    $src = $path . '.' . $i;
    $dst = $path . '.' . ($i + 1);
    if (is_file($dst)) @unlink($dst);
    if (is_file($src)) @rename($src, $dst);
  }
  @rename($path, $path . '.1');
  @file_put_contents($path, '');
}

function tp_log(string $channel, string $level, string $message, array $ctx = []): void {
  if (!tp_log_enabled()) return;
  $min = tp_log_min_level();
  if (tp_log_level_value($level) < $min) return;

  $path = tp_log_path($channel);
  tp_log_rotate_if_needed($path);

  $ts = date('c');
  $lvl = strtoupper(trim($level));
  if ($lvl === '') $lvl = 'INFO';

  $rid = defined('TP_REQ_ID') ? (string)TP_REQ_ID : '';
  if ($rid !== '' && !isset($ctx['rid'])) $ctx['rid'] = $rid;

  // Avoid logging secrets by default
  foreach (['token','api_key','secret','password','pass','db_pass'] as $k) {
    if (isset($ctx[$k])) $ctx[$k] = '***';
  }

  $line = '[' . $ts . '] [' . $lvl . '] ' . $message;
  if ($ctx) {
    $line .= ' ' . json_encode($ctx, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
  }
  $line .= "\n";

  try {
    @file_put_contents($path, $line, FILE_APPEND | LOCK_EX);
  } catch (Throwable $e) {
    // last resort
    try { error_log($line); } catch (Throwable $e2) {}
  }
}

function tp_status_write(string $name, array $payload): void {
  $name = strtolower(trim($name));
  $name = preg_replace('/[^a-z0-9_.-]/', '_', $name);
  if ($name === '') $name = 'unknown';

  $dir = tp_status_dir();
  $path = rtrim($dir, '/\\') . '/' . $name . '.json';

  $base = [
    'name' => $name,
    'ts' => time(),
    'iso' => date('c'),
    'env' => (string)(function_exists('env') ? env('APP_ENV','prod') : (getenv('APP_ENV') ?: 'prod')),
  ];

  $out = $base + $payload;

  $tmp = $path . '.tmp';
  try {
    @file_put_contents($tmp, json_encode($out, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES), LOCK_EX);
    @rename($tmp, $path);
  } catch (Throwable $e) {
    // ignore
  }
}

function tp_status_read(string $name): ?array {
  $name = strtolower(trim($name));
  $name = preg_replace('/[^a-z0-9_.-]/', '_', $name);
  if ($name === '') return null;
  $path = rtrim(tp_status_dir(), '/\\') . '/' . $name . '.json';
  if (!is_file($path)) return null;
  $raw = @file_get_contents($path);
  $j = json_decode((string)$raw, true);
  return is_array($j) ? $j : null;
}

function tp_status_list(): array {
  $dir = tp_status_dir();
  if (!is_dir($dir)) return [];
  $out = [];
  foreach (glob(rtrim($dir, '/\\') . '/*.json') ?: [] as $p) {
    $raw = @file_get_contents($p);
    $j = json_decode((string)$raw, true);
    if (is_array($j) && isset($j['name'])) $out[] = $j;
  }
  usort($out, function($a,$b){
    return ((int)($b['ts'] ?? 0)) <=> ((int)($a['ts'] ?? 0));
  });
  return $out;
}
