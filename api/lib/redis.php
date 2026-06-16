<?php
declare(strict_types=1);

/**
 * Redis Pub/Sub layer for Quote Central.
 *
 * When REDIS_URL is configured, writes publish a lightweight "quote:update"
 * event and SSE/health endpoints can subscribe to real-time channels instead
 * of polling the DB.
 */

function redis_url(): string {
  return trim((string)(getenv('REDIS_URL') ?: getenv('REDISCLOUD_URL') ?: ''));
}

function redis_enabled(): bool {
  return redis_url() !== '';
}

function redis_connect(): ?Redis {
  static $redis = null;
  if ($redis !== null) return $redis;

  $url = redis_url();
  if (!$url) return null;

  try {
    $redis = new Redis();

    if (str_starts_with($url, 'redis://')) {
      $url = 'tcp://' . substr($url, 8);
    }
    $parsed = parse_url($url);
    $scheme = $parsed['scheme'] ?? 'tcp';
    $host = $parsed['host'] ?? '127.0.0.1';
    $port = (int)($parsed['port'] ?? 6379);
    $pass = $parsed['pass'] ?? null;
    $db = isset($parsed['path']) ? (int)ltrim($parsed['path'], '/') : 0;

    $connected = @$redis->connect($host, $port, 0.5);
    if (!$connected) { $redis = null; return null; }

    if ($pass) $redis->auth($pass);
    if ($db > 0) $redis->select($db);

    $redis->setOption(Redis::OPT_SERIALIZER, Redis::SERIALIZER_NONE);
    return $redis;
  } catch (Throwable $e) {
    $redis = null;
    return null;
  }
}

function redis_publish_quote(array $data): bool {
  $redis = redis_connect();
  if (!$redis) return false;

  try {
    $symbol = strtoupper($data['symbol'] ?? '');
    $type = strtolower($data['type'] ?? '');
    if (!$symbol || !$type) return false;

    $payload = json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if (!$payload) return false;

    $channel = 'quotes:' . $type;
    $redis->publish($channel, $payload);
    $redis->publish('quotes:all', $payload);
    return true;
  } catch (Throwable $e) {
    return false;
  }
}

function redis_get_quote(string $symbol, string $type): ?array {
  $redis = redis_connect();
  if (!$redis) return null;

  try {
    $key = 'quote:' . strtolower(vp_normalize_asset_type($type)) . ':' . strtoupper($symbol);
    $raw = $redis->get($key);
    if (!$raw) return null;
    $data = json_decode($raw, true);
    return is_array($data) ? $data : null;
  } catch (Throwable $e) {
    return null;
  }
}

function redis_set_quote(array $data, int $ttl = 300): bool {
  $redis = redis_connect();
  if (!$redis) return false;

  try {
    $symbol = strtoupper($data['symbol'] ?? '');
    $type = strtolower($data['type'] ?? '');
    if (!$symbol || !$type) return false;

    $key = 'quote:' . strtolower(vp_normalize_asset_type($type)) . ':' . $symbol;
    $payload = json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if (!$payload) return false;

    $redis->setex($key, max(1, $ttl), $payload);
    return true;
  } catch (Throwable $e) {
    return false;
  }
}

function redis_subscribe_quotes(callable $callback, array $types = [], int $timeoutMs = 0): void {
  $redis = redis_connect();
  if (!$redis) return;

  try {
    $channels = ['quotes:all'];
    foreach ($types as $type) {
      $channels[] = 'quotes:' . strtolower(vp_normalize_asset_type($type));
    }
    $channels = array_unique($channels);

    $redis->subscribe($channels, function($redis, $channel, $message) use ($callback) {
      $data = json_decode($message, true);
      if (is_array($data)) $callback($data, $channel);
    });
  } catch (Throwable $e) {
    // Subscription errors are non-fatal
  }
}
