<?php
// TEMPORARY Stripe diagnostic (guarded by DEBUG_KEY). Safe to delete after use.
declare(strict_types=1);
require_once __DIR__ . '/../lib/common.php';

$k = (string)($_GET['key'] ?? '');
$allowed = array_values(array_filter([
  (string)env('DEBUG_KEY',''),
  (string)env('CRON_KEY',''),
  (string)env('INSTALL_KEY',''),
], fn($v)=>$v!=='' ));
if ($k === '' || !in_array($k, $allowed, true)) {
  json_response(['ok'=>false,'error'=>'Forbidden'], 403);
}

$out = [
  'php' => PHP_VERSION,
  'stripe_enabled_env' => (string)env('STRIPE_ENABLED','0'),
  'secret_prefix' => substr((string)env('STRIPE_SECRET_KEY',''), 0, 8),
  'secret_present' => env_nonempty('STRIPE_SECRET_KEY') !== '',
  'webhook_secret_present' => env_nonempty('STRIPE_WEBHOOK_SECRET') !== '',
  'currency' => (string)env('STRIPE_CURRENCY','usd'),
  'app_url_env' => (string)env('APP_URL',''),
  'site_url_env' => (string)env('SITE_URL',''),
  'vendor_autoload' => is_file(__DIR__ . '/../../vendor/autoload.php') ? 'present' : 'missing',
];

try {
  require_once __DIR__ . '/../lib/stripe_bootstrap.php';
  $out['stripe_app_url'] = function_exists('stripe_app_url') ? stripe_app_url() : '(missing fn)';
  $out['checkout_currency'] = function_exists('stripe_checkout_currency') ? stripe_checkout_currency() : '(missing fn)';
  if (class_exists('\\Stripe\\Stripe')) {
    $out['sdk_version'] = defined('\\Stripe\\Stripe::VERSION') ? \Stripe\Stripe::VERSION : (string)(\Stripe\Stripe::VERSION ?? '?');
    $out['sdk_api_version'] = method_exists('\\Stripe\\Stripe','getApiVersion') ? (string)\Stripe\Stripe::getApiVersion() : '?';
  } else {
    $out['sdk_version'] = 'class-missing';
  }
} catch (Throwable $e) {
  $out['bootstrap_error'] = $e->getMessage();
}

// Latest stored stripe deposit error (historical root cause)
try {
  $pdo = db();
  $st = $pdo->query("SELECT id, status, details_json FROM deposits WHERE provider='stripe' ORDER BY id DESC LIMIT 1");
  $row = $st ? $st->fetch(PDO::FETCH_ASSOC) : null;
  if ($row) {
    $det = json_decode((string)($row['details_json'] ?? ''), true);
    $out['last_deposit'] = [
      'id' => (int)$row['id'],
      'status' => (string)$row['status'],
      'stripe_error' => is_array($det) ? ($det['stripe_error'] ?? null) : null,
    ];
  } else {
    $out['last_deposit'] = null;
  }
} catch (Throwable $e) {
  $out['last_deposit_error'] = $e->getMessage();
}

// Live probe: attempt a real Checkout Session create with the fixed (fragment-free) URLs.
$ready = false;
try {
  stripe_require_ready();
  $ready = true;
} catch (Throwable $e) {
  $out['ready'] = false;
  $out['ready_blocked'] = 'stripe_require_ready emitted a response';
}
if ($ready) {
  $out['ready'] = true;
  $base = stripe_app_url();
  try {
    $session = \Stripe\Checkout\Session::create([
      'mode' => 'payment',
      'payment_method_types' => ['card'],
      'success_url' => $base . '/app.php?stripe=success&deposit=probe',
      'cancel_url' => $base . '/app.php?stripe=cancel&deposit=probe',
      'line_items' => [[
        'quantity' => 1,
        'price_data' => [
          'currency' => stripe_checkout_currency(),
          'unit_amount' => 100,
          'product_data' => ['name' => 'MEX diagnostic probe'],
        ],
      ]],
    ]);
    $out['session_ok'] = true;
    $out['session_id'] = (string)$session->id;
    $out['session_url_present'] = !empty($session->url);
  } catch (Throwable $e) {
    $out['session_ok'] = false;
    $out['session_error_class'] = get_class($e);
    $out['session_error'] = $e->getMessage();
  }
}

json_response(['ok'=>true,'probe'=>$out]);
