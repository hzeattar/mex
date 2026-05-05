<?php
require_once __DIR__ . '/includes/auth.php';
admin_require();

$pdo = db();
$userId = (int)($_GET['user_id'] ?? $_POST['user_id'] ?? 0);
$msg = null; $err = null;

function tg_send_message(string $botToken, string $chatId, string $text): array {
  $url = 'https://api.telegram.org/bot' . $botToken . '/sendMessage';
  $payload = json_encode([
    'chat_id' => $chatId,
    'text' => $text,
    'parse_mode' => 'HTML',
    'disable_web_page_preview' => true,
  ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_CONNECTTIMEOUT => 6,
    CURLOPT_TIMEOUT => 12,
  ]);
  $resp = curl_exec($ch);
  $errNo = curl_errno($ch);
  $errStr = curl_error($ch);
  $http = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);

  if ($errNo) throw new RuntimeException('Telegram send failed: ' . $errStr);
  $j = json_decode((string)$resp, true);
  if ($http >= 400 || !is_array($j) || !($j['ok'] ?? false)) {
    $desc = is_array($j) ? ($j['description'] ?? 'unknown') : 'bad_response';
    throw new RuntimeException('Telegram error: ' . $desc);
  }
  return $j;
}

// Load user
$user = null;
if ($userId > 0) {
  $st = $pdo->prepare('SELECT id, telegram_chat_id, username, first_name, last_name FROM users WHERE id=? LIMIT 1');
  $st->execute([$userId]);
  $user = $st->fetch(PDO::FETCH_ASSOC) ?: null;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $text = trim((string)($_POST['message'] ?? ''));
  if (!$user) {
    $err = 'User not found.';
  } elseif (!$user['telegram_chat_id']) {
    $err = 'User has no telegram_chat_id. They must start the bot at least once.';
  } elseif ($text === '') {
    $err = 'Message is empty.';
  } else {
    $token = (string)env('BOT_TOKEN', '');
    if ($token === '') $token = (string)env('TELEGRAM_BOT_TOKEN', '');
    if ($token === '') {
      $err = 'BOT_TOKEN is missing in .env';
    } else {
      try {
        tg_send_message($token, (string)$user['telegram_chat_id'], $text);
        $msg = 'Message sent.';
      } catch (Throwable $e) {
        $err = $e->getMessage();
      }
    }
  }
}

$name = $user ? trim((string)($user['first_name'] ?? '') . ' ' . (string)($user['last_name'] ?? '')) : '';
$uname = $user ? (string)($user['username'] ?? '') : '';
$chatId = $user ? (string)($user['telegram_chat_id'] ?? '') : '';

$body = "<div class='card'><h2>Message user</h2>";
if ($msg) $body .= "<div class='ok'>".htmlspecialchars($msg)."</div>";
if ($err) $body .= "<div class='err'>".htmlspecialchars($err)."</div>";

if (!$user) {
  $body .= "<div class='muted'>User not found.</div></div>";
  admin_layout('Message user', $body);
  exit;
}

$body .= "<div class='muted small' style='margin-bottom:10px'>".
  "<b>User:</b> #".htmlspecialchars((string)$userId)." ".htmlspecialchars($name)." ".($uname?('(@'.htmlspecialchars($uname).')'):'')."<br>".
  "<b>Chat ID:</b> ".htmlspecialchars($chatId ?: '—').
"</div>";

$body .= "<form method='post'>".
  "<input type='hidden' name='user_id' value='".htmlspecialchars((string)$userId)."'>".
  "<textarea name='message' class='input' rows='6' placeholder='Write your message to the user...' style='width:100%'></textarea>".
  "<div class='row mt-2' style='gap:10px'>".
    "<button class='btn primary' type='submit'>Send</button>".
    "<a class='btn' href='/admin/users.php'>Back</a>".
  "</div>".
"</form></div>";

admin_layout('Message user', $body);
