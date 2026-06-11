<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';

function stripe_autoload_ready(): bool {
  $autoload = __DIR__ . '/../../vendor/autoload.php';
  if (!is_file($autoload)) return false;
  require_once $autoload;
  return class_exists(\Stripe\Stripe::class);
}

function stripe_enabled(): bool {
  $enabled = strtolower((string)env('STRIPE_ENABLED', '0'));
  return in_array($enabled, ['1', 'true', 'yes', 'on'], true);
}

function stripe_require_ready(): void {
  if (!stripe_enabled()) {
    json_response(['ok' => false, 'error' => 'Stripe is disabled'], 503);
  }
  if (!stripe_autoload_ready()) {
    json_response(['ok' => false, 'error' => 'Stripe SDK is not installed'], 500);
  }
  $secret = trim((string)env('STRIPE_SECRET_KEY', ''));
  if ($secret === '') {
    json_response(['ok' => false, 'error' => 'Stripe secret key is missing'], 503);
  }
  \Stripe\Stripe::setApiKey($secret);
  // Only pin an explicit API version when provided; otherwise use the version the
  // installed SDK is aligned with (avoids "invalid API version" / shape mismatches).
  $apiVersion = trim((string)env('STRIPE_API_VERSION', ''));
  if ($apiVersion !== '') {
    \Stripe\Stripe::setApiVersion($apiVersion);
  }
}

function stripe_checkout_currency(): string {
  $currency = strtolower(trim((string)env('STRIPE_CURRENCY', 'usd')));
  return preg_match('/^[a-z]{3}$/', $currency) ? $currency : 'usd';
}

function stripe_amount_to_minor_units(float $amount): int {
  return (int)round($amount * 100);
}

function stripe_app_url(): string {
  // Prefer SITE_URL (clean origin); APP_URL may include a trailing /app.php entry script.
  $url = trim((string)(env('SITE_URL', '') ?: env('APP_URL', '')));
  if ($url === '') {
    $host = (string)($_SERVER['HTTP_HOST'] ?? '');
    $url = $host !== '' ? ('https://' . $host) : '';
  }
  $url = rtrim($url, '/');
  // Drop a trailing front-controller so we never build /app.php/app.php URLs.
  $url = preg_replace('#/(?:app|index)\.php$#i', '', $url) ?? $url;
  return rtrim($url, '/');
}

function stripe_object_metadata_array(mixed $object): array {
  $metadata = $object->metadata ?? [];
  if (is_object($metadata) && method_exists($metadata, 'toArray')) return $metadata->toArray();
  if (is_array($metadata)) return $metadata;
  return [];
}
