<?php
require_once __DIR__ . '/lib/common.php';
require_once __DIR__ . '/lib/schema.php';
require_once __DIR__ . '/lib/settings.php';

$lang = (string)($_GET['lang'] ?? 'en');
$lang = in_array($lang, ['en','ar','ru','hi'], true) ? $lang : 'en';

$about = (string)setting_get("bot.about.$lang", '');
if ($about === '') {
  $about = (string)setting_get('bot.about.en', 'VertexPluse is a professional web trading and investment platform.');
}

$rules = (string)setting_get("bot.rules.$lang", '');

json_response(['ok'=>true,'about'=>$about,'rules'=>$rules]);
