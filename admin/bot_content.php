<?php
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/../api/lib/settings.php';
admin_require();

$pdo = db();
$driver = db_driver();

$msg = '';
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
  $keys = [
    'bot.about.en','bot.about.ar','bot.about.ru',
    'bot.rules.en','bot.rules.ar','bot.rules.ru',
    'bot.welcome.en','bot.welcome.ar','bot.welcome.ru',
    'bot.token','app.url',
  ];
  foreach ($keys as $k) {
    $v = (string)($_POST[str_replace('.', '_', $k)] ?? '');
    setting_set($k, $v);
  }
  $msg = "<div class='card'><span class='pill ok'>Saved</span></div>";
}

function fkey(string $k): string { return str_replace('.', '_', $k); }
$about_en = htmlspecialchars((string)setting_get('bot.about.en', 'VertexPluse is a professional web trading and investment platform.'), ENT_QUOTES,'UTF-8');
$about_ar = htmlspecialchars((string)setting_get('bot.about.ar', ''), ENT_QUOTES,'UTF-8');
$about_ru = htmlspecialchars((string)setting_get('bot.about.ru', ''), ENT_QUOTES,'UTF-8');
$rules_en = htmlspecialchars((string)setting_get('bot.rules.en', ''), ENT_QUOTES,'UTF-8');
$rules_ar = htmlspecialchars((string)setting_get('bot.rules.ar', ''), ENT_QUOTES,'UTF-8');
$rules_ru = htmlspecialchars((string)setting_get('bot.rules.ru', ''), ENT_QUOTES,'UTF-8');
$welcome_en = htmlspecialchars((string)setting_get('bot.welcome.en', 'Welcome to VertexPluse. Choose your language, then open the client area.'), ENT_QUOTES,'UTF-8');
$welcome_ar = htmlspecialchars((string)setting_get('bot.welcome.ar', ''), ENT_QUOTES,'UTF-8');
$welcome_ru = htmlspecialchars((string)setting_get('bot.welcome.ru', ''), ENT_QUOTES,'UTF-8');
$bot_token = htmlspecialchars((string)setting_get('bot.token', ''), ENT_QUOTES,'UTF-8');
$app_url = htmlspecialchars((string)setting_get('app.url', ''), ENT_QUOTES,'UTF-8');

// Deposit/Withdraw flow texts
$flow_keys = [
  'bot.flow.proof_no_session',
  'bot.flow.proof_bad_photo',
  'bot.flow.session_invalid',
  'bot.flow.deposit_submitted',
  'bot.flow.withdraw_submitted',
  'bot.flow.intent_expired',
  'bot.flow.intent_invalid',
  'bot.flow.ask_deposit_amount',
  'bot.flow.ask_withdraw_amount',
  'bot.flow.invalid_amount',
  'bot.flow.choose_country',
  'bot.flow.choose_method',
  'bot.flow.no_methods',
  'bot.flow.session_expired',
  'bot.flow.session_expired_app',
  'bot.flow.user_not_found',
  'bot.flow.withdraw_method_selected',
  'bot.flow.deposit_method_selected',
  'bot.flow.ask_proof',
  'bot.flow.choose_language',
  'bot.flow.internal_error',
  'bot.flow.default_start',
];
$flow_vals = [];
foreach ($flow_keys as $bk) {
  $flow_vals[$bk] = [
    'en' => htmlspecialchars((string)setting_get($bk.'.en', ''), ENT_QUOTES,'UTF-8'),
    'ar' => htmlspecialchars((string)setting_get($bk.'.ar', ''), ENT_QUOTES,'UTF-8'),
    'ru' => htmlspecialchars((string)setting_get($bk.'.ru', ''), ENT_QUOTES,'UTF-8'),
  ];
}

$flowSectionHtml = "<div class='card'>\n  <h3 style='margin:0 0 10px'>Deposit/Withdraw Flow Replies</h3>\n  <div class='muted small'>Editable replies used during deposit/withdraw steps in the Telegram bot. You can use placeholders like <code>{id}</code> and <code>{instructions}</code> where relevant.</div>\n  <div class='muted small' style='margin-top:6px'>Key list is fixed; leave empty to use the built-in default text.</div>\n  <div style='margin-top:10px; display:flex; flex-direction:column; gap:12px'>\n";
foreach ($flow_keys as $bk) {
  $vals = $flow_vals[$bk] ?? ['en'=>'','ar'=>'','ru'=>''];
  $bkEsc = htmlspecialchars((string)$bk, ENT_QUOTES,'UTF-8');
  $flowSectionHtml .= "<div style='border:1px solid #334155; border-radius:10px; padding:10px'>\n";
  $flowSectionHtml .= "  <div class='muted small' style='margin-bottom:6px'><code>{$bkEsc}</code></div>\n";
  $flowSectionHtml .= "  <div class='grid' style='grid-template-columns:1fr 1fr 1fr; gap:10px'>\n";
  $flowSectionHtml .= "    <div><div class='muted small'>EN</div><textarea name='".fkey($bk.'.en')."' rows='3'>".$vals['en']."</textarea></div>\n";
  $flowSectionHtml .= "    <div><div class='muted small'>AR</div><textarea name='".fkey($bk.'.ar')."' rows='3'>".$vals['ar']."</textarea></div>\n";
  $flowSectionHtml .= "    <div><div class='muted small'>RU</div><textarea name='".fkey($bk.'.ru')."' rows='3'>".$vals['ru']."</textarea></div>\n";
  $flowSectionHtml .= "  </div>\n</div>\n";
}
$flowSectionHtml .= "  </div>\n</div>\n";


$body = $msg . "
<div class='card'>
  <h2 style='margin:0 0 10px'>Bot Content</h2>
  <div class='muted small'>These texts are used by the Telegram bot (/info, /rules) and can also be shown inside the mini app.</div>
</div>
<form method='post'>
<div class='card'>
  <h3 style='margin:0 0 10px'>About</h3>
  <div class='grid' style='grid-template-columns:1fr 1fr 1fr'>
    <div><div class='muted small'>EN</div><textarea name='".fkey('bot.about.en')."' rows='6'>$about_en</textarea></div>
    <div><div class='muted small'>AR</div><textarea name='".fkey('bot.about.ar')."' rows='6'>$about_ar</textarea></div>
    <div><div class='muted small'>RU</div><textarea name='".fkey('bot.about.ru')."' rows='6'>$about_ru</textarea></div>
  </div>
</div>
<div class='card'>
  <h3 style='margin:0 0 10px'>Rules</h3>
  <div class='grid' style='grid-template-columns:1fr 1fr 1fr'>
    <div><div class='muted small'>EN</div><textarea name='".fkey('bot.rules.en')."' rows='6'>$rules_en</textarea></div>
    <div><div class='muted small'>AR</div><textarea name='".fkey('bot.rules.ar')."' rows='6'>$rules_ar</textarea></div>
    <div><div class='muted small'>RU</div><textarea name='".fkey('bot.rules.ru')."' rows='6'>$rules_ru</textarea></div>
  </div>
</div>

<div class='card'>
  <h3 style='margin:0 0 10px'>Welcome message</h3>
  <div class='grid' style='grid-template-columns:1fr 1fr 1fr'>
    <div><div class='muted small'>EN</div><textarea name='".fkey('bot.welcome.en')."' rows='5'>$welcome_en</textarea></div>
    <div><div class='muted small'>AR</div><textarea name='".fkey('bot.welcome.ar')."' rows='5'>$welcome_ar</textarea></div>
    <div><div class='muted small'>RU</div><textarea name='".fkey('bot.welcome.ru')."' rows='5'>$welcome_ru</textarea></div>
  </div>
  <div class='muted small' style='margin-top:8px'>You can use HTML tags (basic).</div>
</div>





".$flowSectionHtml."

<div class='card'>
  <h3 style='margin:0 0 10px'>Bot Settings</h3>
  <div class='grid' style='grid-template-columns:1fr 1fr'>
    <div>
      <div class='muted small'>Bot token</div>
      <input class='input' name='".fkey('bot.token')."' value='$bot_token' placeholder='123:ABC...' />
    </div>
    <div>
      <div class='muted small'>App URL (for Open App button)</div>
      <input class='input' name='".fkey('app.url')."' value='$app_url' placeholder='https://your-domain/' />
    </div>
  </div>
  <div class='muted small' style='margin-top:8px'>After saving, open <code>/bot/set_webhook.php</code> once to register webhook.</div>
</div>
<div class='card'>
  <button class='btn primary' type='submit'>Save</button>
</div>
</form>";

admin_layout('Bot Content', $body);