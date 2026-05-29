<?php
declare(strict_types=1);
require_once __DIR__ . '/api/lib/common.php';
require_once __DIR__ . '/api/lib/settings.php';
require_once __DIR__ . '/api/lib/schema.php';

try {
  $env = strtolower((string)env('APP_ENV', 'local'));
  $autoMigrate = (string)env('AUTO_MIGRATE', '0') === '1';
  if ($autoMigrate || !in_array($env, ['production', 'prod'], true)) {
    $pdo = db();
    schema_install($pdo, db_driver());
    schema_upgrade($pdo, db_driver());
    schema_seed_defaults($pdo, db_driver());
  }
} catch (Throwable $e) {
  // Public pages should stay reachable even if maintenance tasks fail.
}

function site_setting(string $key, string $default = ''): string {
  static $settingsUnavailable = false;
  if ($settingsUnavailable) return $default;

  try {
    $v = setting_get($key, $default);
    return is_string($v) ? $v : $default;
  } catch (Throwable $e) {
    $settingsUnavailable = true;
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
    if ($v !== '') return $v;
  }
  return '';
}



function safe_public_redirect_target(?string $target, string $fallback = '/app.php#/home'): string {
  $target = trim((string)$target);
  if ($target === '') return $fallback;
  if (preg_match('~^[a-z][a-z0-9+.-]*://~i', $target)) return $fallback;
  if (str_starts_with($target, '//')) return $fallback;
  if (!str_starts_with($target, '/')) return $fallback;
  return $target;
}
