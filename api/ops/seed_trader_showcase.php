<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/common.php';

require_method('POST');

function ops_seed_bearer_token(): string {
  $auth = (string)($_SERVER['HTTP_AUTHORIZATION'] ?? '');
  if (preg_match('/^Bearer\s+(.+)$/i', $auth, $m)) {
    return trim((string)$m[1]);
  }
  return '';
}

function ops_seed_input_token(): string {
  $token = (string)(
    $_GET['token']
    ?? $_POST['token']
    ?? $_GET['key']
    ?? $_POST['key']
    ?? $_SERVER['HTTP_X_CRON_KEY']
    ?? $_SERVER['HTTP_X_INSTALL_KEY']
    ?? $_SERVER['HTTP_X_SEED_KEY']
    ?? ops_seed_bearer_token()
    ?? ''
  );
  return trim($token);
}

$expected = (string)(env('CRON_KEY', '') ?: env('INSTALL_KEY', ''));
$token = ops_seed_input_token();
if ($expected === '' || $token === '' || !hash_equals($expected, $token)) {
  json_response(['ok' => false, 'error' => 'Forbidden'], 403);
}

if (!function_exists('exec')) {
  json_response(['ok' => false, 'error' => 'exec_disabled'], 500);
}

$email = strtolower(trim((string)($_POST['email'] ?? $_GET['email'] ?? 'trader@mixgroup.com')));
$password = (string)($_POST['password'] ?? $_GET['password'] ?? 'Trader@2026');
$reset = (string)($_POST['reset'] ?? $_GET['reset'] ?? '1');
$resetPassword = (string)($_POST['reset_password'] ?? $_GET['reset_password'] ?? '0');
$realBalance = (string)($_POST['real_balance'] ?? $_GET['real_balance'] ?? '250000');
$demoBalance = (string)($_POST['demo_balance'] ?? $_GET['demo_balance'] ?? '100000');

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
  json_response(['ok' => false, 'error' => 'Invalid email'], 422);
}

$script = realpath(__DIR__ . '/../../scripts/seed_trader_showcase.php');
if (!$script || !is_file($script)) {
  json_response(['ok' => false, 'error' => 'seed_script_missing'], 500);
}

$phpCli = rtrim((string)PHP_BINDIR, '/\\') . DIRECTORY_SEPARATOR . 'php';
if (!is_file($phpCli)) {
  $phpCli = 'php';
}

$args = [
  $phpCli,
  $script,
  '--email=' . $email,
  '--password=' . $password,
  '--reset=' . ($reset === '0' ? '0' : '1'),
  '--reset-password=' . ($resetPassword === '1' ? '1' : '0'),
  '--real-balance=' . (string)((float)$realBalance),
  '--demo-balance=' . (string)((float)$demoBalance),
];

$cmd = implode(' ', array_map('escapeshellarg', $args)) . ' 2>&1';
$lines = [];
$exitCode = 1;
exec($cmd, $lines, $exitCode);
$raw = trim(implode("\n", $lines));
$decoded = $raw !== '' ? json_decode($raw, true) : null;

if (!is_array($decoded)) {
  json_response([
    'ok' => false,
    'error' => 'seed_output_invalid',
    'exit_code' => $exitCode,
    'output' => substr($raw, 0, 2000),
  ], 500);
}

$decoded['runner'] = 'api_ops';
$decoded['exit_code'] = $exitCode;
json_response($decoded, !empty($decoded['ok']) && $exitCode === 0 ? 200 : 500);
