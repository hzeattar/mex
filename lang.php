<?php
declare(strict_types=1);

function tp_project_langs(): array {
  return ['en','ar','ru','de','fr','zh'];
}

function tp_legacy_lang_aliases(): array {
  return [
    'hi' => 'en',
    'cn' => 'zh',
    'zh-cn' => 'zh',
    'zh_hans' => 'zh',
  ];
}

function tp_normalize_lang(?string $lang, ?array $allowed = null, string $default = 'en'): string {
  $allowed = $allowed ?: tp_project_langs();
  $default = in_array($default, $allowed, true) ? $default : ($allowed[0] ?? 'en');
  $lang = strtolower(trim((string)$lang));
  if ($lang === '') return $default;
  $aliases = tp_legacy_lang_aliases();
  if (isset($aliases[$lang])) $lang = $aliases[$lang];
  return in_array($lang, $allowed, true) ? $lang : $default;
}

function tp_is_supported_lang(?string $lang, ?array $allowed = null): bool {
  $allowed = $allowed ?: tp_project_langs();
  return tp_normalize_lang($lang, $allowed, '__none__') !== '__none__';
}

function tp_lang_labels(?array $allowed = null): array {
  $allowed = $allowed ?: tp_project_langs();
  $all = [
    'ar' => 'العربية',
    'en' => 'English',
    'ru' => 'Русский',
    'de' => 'Deutsch',
    'fr' => 'Français',
    'zh' => '中文',
  ];
  $out = [];
  foreach ($allowed as $lang) {
    if (isset($all[$lang])) $out[$lang] = $all[$lang];
  }
  return $out;
}
