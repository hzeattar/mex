<?php
declare(strict_types=1);
require_once __DIR__ . '/api/lib/common.php';
require_once __DIR__ . '/api/lib/settings.php';

function site_setting(string $key, string $default = ''): string {
  try {
    $v = setting_get($key, $default);
    return is_string($v) ? $v : $default;
  } catch (Throwable $e) {
    return $default;
  }
}

function site_defaults(): array {
  return [
    'brand' => site_setting('site.brand', 'VertexPluse'),
    'tagline' => site_setting('site.tagline', 'Professional multi-asset trading platform'),
    'hero_title' => site_setting('site.hero_title', 'Life is Better with Money'),
    'hero_subtitle' => site_setting('site.hero_subtitle', 'Trade with a modern web platform for crypto, forex, stocks, commodities, investment plans, and account funding.'),
    'hero_primary_text' => site_setting('site.hero_primary_text', 'Open Live Account'),
    'hero_primary_url' => site_setting('site.hero_primary_url', '/register.php'),
    'hero_secondary_text' => site_setting('site.hero_secondary_text', 'Try Client Area'),
    'hero_secondary_url' => site_setting('site.hero_secondary_url', '/login.php'),
    'support_email' => site_setting('site.support_email', 'support@vertexpluse.com'),
    'public_footer_note' => site_setting('site.public_footer_note', 'Trade CFDs and digital assets responsibly. Markets involve risk.'),
  ];
}

function telegram_login_bot_username(): string {
  $candidates = [];
  try { $candidates[] = site_setting('bot.username', ''); } catch (Throwable $e) {}
  try { $candidates[] = (string)env('TELEGRAM_BOT_USERNAME', ''); } catch (Throwable $e) {}
  try { $candidates[] = (string)env('BOT_USERNAME', ''); } catch (Throwable $e) {}
  foreach ($candidates as $v) {
    $v = trim((string)$v);
    if ($v === '') continue;
    $v = ltrim($v, '@');
    $v = preg_replace('/[^A-Za-z0-9_]/', '', $v);
    if (strlen($v) >= 3) return $v;
  }
  return '';
}

function telegram_login_enabled(): bool {
  return telegram_login_bot_username() !== '';
}

function session_user_id(): int {
  if (session_status() === PHP_SESSION_NONE) {
    try { @session_start(); } catch (Throwable $e) {}
  }
  $id = $_SESSION['user_id'] ?? 0;
  return is_int($id) ? $id : (is_numeric($id) ? (int)$id : 0);
}

function session_csrf_token(): string {
  if (session_status() === PHP_SESSION_NONE) {
    try { @session_start(); } catch (Throwable $e) {}
  }
  if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
  }
  return $_SESSION['csrf_token'];
}

function verify_csrf_token(string $token): bool {
  return hash_equals(session_csrf_token(), $token);
}
