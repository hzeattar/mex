<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../../bot/countries.php';

header('Content-Type: application/json; charset=utf-8');

require_method('GET');

$lang = strtolower(trim((string)($_GET['lang'] ?? 'en')));
if (!in_array($lang, ['en','ar','ru'], true)) $lang = 'en';

$items = [];
foreach (mex_countries_sorted($lang) as $it) {
  $cc = (string)($it['code'] ?? '');
  $label = (string)($it['label'] ?? '');
  if ($cc === '') continue;
  $flag  = mex_flag_emoji($cc);
  $dialCode = mex_country_dial_code($cc);
  $items[] = [
    'code' => $cc,
    'label' => $label,
    'name' => trim($flag . ' ' . $label),
    'flag' => $flag,
    'dial_code' => $dialCode,
  ];
}

json_response([
  'ok' => true,
  'items' => $items,
]);
