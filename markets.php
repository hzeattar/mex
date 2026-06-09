<?php
declare(strict_types=1);

/**
 * Legacy public markets page.
 *
 * The standalone marketing markets page was retired; the live markets list now
 * lives inside the trading workspace. This stub keeps the old public nav link
 * (/markets.php) working by redirecting into the app instead of fataling on a
 * stale include path. The JSON markets API is a separate file: /api/markets.php
 */

$lang = preg_replace('/[^a-z]/', '', strtolower((string)($_GET['lang'] ?? $_COOKIE['vp_lang'] ?? 'en')));
if ($lang === '') {
    $lang = 'en';
}

$target = '/app.php?lang=' . rawurlencode($lang) . '#/trade';
$linkText = $lang === 'ar' ? 'المتابعة إلى أسواق MEX Group'
    : ($lang === 'ru' ? 'Перейти к рынкам MEX Group' : 'Continue to MEX Group markets');
$dir = $lang === 'ar' ? 'rtl' : 'ltr';
header('Location: ' . $target, true, 302);
header('Cache-Control: no-store');
echo '<!doctype html><html lang="' . htmlspecialchars($lang, ENT_QUOTES, 'UTF-8') . '" dir="' . $dir . '"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=' . htmlspecialchars($target, ENT_QUOTES, 'UTF-8') . '">'
    . '<title>MEX Group</title>'
    . '<a href="' . htmlspecialchars($target, ENT_QUOTES, 'UTF-8') . '">' . htmlspecialchars($linkText, ENT_QUOTES, 'UTF-8') . '</a>';
exit;
