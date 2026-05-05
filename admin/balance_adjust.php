<?php
require_once __DIR__ . '/includes/auth.php';
admin_require();

require_once __DIR__ . '/../api/lib/ledger.php';

function h($s){ return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

$pdo = db();
$msg = '';
$err = '';

$q = trim((string)($_GET['q'] ?? ''));
$userId = (int)($_GET['user_id'] ?? ($_POST['user_id'] ?? 0));

// Resolve user (optional)
$user = null;
if ($userId > 0) {
  $st = $pdo->prepare('SELECT id,tg_id,telegram_chat_id,username,first_name,last_name,locale,created_at FROM users WHERE id=? LIMIT 1');
  $st->execute([$userId]);
  $user = $st->fetch(PDO::FETCH_ASSOC) ?: null;
  if (!$user) $userId = 0;
}

// Handle POST (adjust)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  try {
    if ($userId <= 0) throw new Exception('Select a user first');

    $currency = strtoupper(trim((string)($_POST['currency'] ?? 'USDT')));
    $amountStr = trim((string)($_POST['amount'] ?? ''));
    $note = trim((string)($_POST['note'] ?? ''));

    if ($amountStr === '') throw new Exception('Amount is required');
    if (!preg_match('/^[A-Z0-9_]{2,16}$/', $currency)) throw new Exception('Invalid currency');

    $amount = (float)$amountStr;
    if (!is_finite($amount) || abs($amount) < 1e-12) throw new Exception('Invalid amount');

    // Make sure wallet exists
    ensure_wallet($userId, $currency);

    ledger_add($userId, $currency, $amount, 'admin_adjust', null, null, [
      'note' => $note,
      'admin_id' => (string)($_SESSION['admin_id'] ?? ''),
      'admin_email' => (string)($_SESSION['admin_email'] ?? ''),
    ]);

    $msg = 'Balance updated (ledger entry added).';

    // refresh user
    $st = $pdo->prepare('SELECT id,tg_id,telegram_chat_id,username,first_name,last_name,locale,created_at FROM users WHERE id=? LIMIT 1');
    $st->execute([$userId]);
    $user = $st->fetch(PDO::FETCH_ASSOC) ?: null;
  } catch (Throwable $e) {
    $err = $e->getMessage();
  }
}

// Users list (search)
$params = [];
$where = '';
if ($q !== '') {
  $like = '%'.$q.'%';
  $cast = (db_driver() === 'mysql') ? 'CAST(id AS CHAR)' : 'CAST(id AS TEXT)';
  $where = "WHERE $cast LIKE ? OR tg_id LIKE ? OR username LIKE ? OR first_name LIKE ? OR last_name LIKE ?";
  $params = [$like,$like,$like,$like,$like];
}

$users = [];
try {
  $st = $pdo->prepare("SELECT id,tg_id,telegram_chat_id,username,first_name,last_name,locale,created_at FROM users $where ORDER BY id DESC LIMIT 200");
  $st->execute($params);
  $users = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
} catch (Throwable $e) {
  $users = [];
}

// Wallet snapshot for selected user
$wallets = [];
$currencies = ['USDT','USDT_DEMO','BTC','ETH','TRX'];
if ($userId > 0) {
  try {
    $st = $pdo->prepare("SELECT currency FROM wallets WHERE user_id=? GROUP BY currency ORDER BY currency");
    $st->execute([$userId]);
    $fromDb = array_map(fn($r)=>strtoupper((string)$r['currency']), ($st->fetchAll(PDO::FETCH_ASSOC) ?: []));
    $currencies = array_values(array_unique(array_merge($fromDb, $currencies)));
  } catch (Throwable $e) {}

  foreach ($currencies as $c) {
    try {
      $wallets[] = array_merge(['currency'=>$c], wallet_available($userId, $c));
    } catch (Throwable $e) {
      // ignore missing
    }
  }
  // Remove zero wallets (optional)
  $wallets = array_values(array_filter($wallets, fn($w)=>abs((float)$w['balance']) > 1e-12 || abs((float)$w['holds']) > 1e-12));
}

$body = '';
if ($msg) $body .= "<div class='card ok'>".h($msg)."</div>";
if ($err) $body .= "<div class='card bad'>".h($err)."</div>";

$body .= "<div class='card'>
  <h2>Adjust Balance</h2>
  <p class='muted' style='margin-top:6px'>Adds an auditable ledger entry. Use <b>positive</b> to add, <b>negative</b> to subtract.</p>
</div>";

// Selected user panel
if ($userId > 0 && $user) {
  $name = trim((string)($user['first_name'] ?? '').' '.(string)($user['last_name'] ?? ''));
  $body .= "<div class='card'>
    <h3 style='margin-top:0'>Selected user</h3>
    <div class='grid' style='grid-template-columns:repeat(3,minmax(0,1fr));gap:12px'>
      <div><div class='muted tiny'>User ID</div><div><b>".h($user['id'])."</b></div></div>
      <div><div class='muted tiny'>Telegram ID</div><div><b>".h($user['tg_id'] ?? '')."</b></div></div>
      <div><div class='muted tiny'>Username</div><div><b>@".h($user['username'] ?? '')."</b></div></div>
      <div style='grid-column:1/-1'><div class='muted tiny'>Name</div><div><b>".h($name !== '' ? $name : '—')."</b></div></div>
    </div>

    <hr style='border:0;border-top:1px solid #1f2937;margin:14px 0'>

    <h3 style='margin:0 0 10px 0'>Wallets</h3>";

  if (!$wallets) {
    $body .= "<div class='muted'>No wallets yet (create one by adjusting a currency).</div>";
  } else {
    $body .= "<table><thead><tr><th>Currency</th><th>Balance</th><th>Holds</th><th>Available</th></tr></thead><tbody>";
    foreach ($wallets as $w) {
      $body .= "<tr><td><b>".h($w['currency'])."</b></td><td>".h(number_format((float)$w['balance'], 8, '.', ''))."</td><td>".h(number_format((float)$w['holds'], 8, '.', ''))."</td><td>".h(number_format((float)$w['available'], 8, '.', ''))."</td></tr>";
    }
    $body .= "</tbody></table>";
  }

  $body .= "
    <hr style='border:0;border-top:1px solid #1f2937;margin:14px 0'>

    <h3 style='margin:0 0 10px 0'>Manual adjustment</h3>
    <form method='post' class='grid' style='grid-template-columns:1fr 1fr 1fr;gap:12px;align-items:end'>
      <input type='hidden' name='user_id' value='".h($userId)."'>

      <div>
        <label>Currency</label>
        <select name='currency'>";

  foreach ($currencies as $c) {
    $body .= "<option value='".h($c)."'>".h($c)."</option>";
  }

  $body .= "</select>
      </div>

      <div>
        <label>Amount</label>
        <input name='amount' placeholder='e.g. 50 or -10'>
      </div>

      <div>
        <label>Note</label>
        <input name='note' placeholder='Optional'>
      </div>

      <div style='grid-column:1/-1;display:flex;gap:10px;flex-wrap:wrap'>
        <button class='btn'>Apply</button>
        <a class='btn' href='/admin/balance_adjust.php'>Clear</a>
      </div>
    </form>
  </div>";
}

// Users list
$body .= "<div class='card'>
  <h3 style='margin-top:0'>Users</h3>
  <form method='get' style='display:flex;gap:10px;align-items:center;flex-wrap:wrap'>
    <input name='q' value='".h($q)."' placeholder='Search by id / tg_id / username / name' style='min-width:280px'>
    <button class='btn'>Search</button>";

if ($userId > 0) {
  $body .= "<input type='hidden' name='user_id' value='".h($userId)."'>";
}

$body .= "</form>
  <div class='muted tiny' style='margin-top:8px'>Showing up to 200 users. Click Select to adjust.</div>

  <table style='margin-top:10px'>
    <thead><tr>
      <th>ID</th><th>Telegram ID</th><th>Username</th><th>Name</th><th>Locale</th><th>Created</th><th></th>
    </tr></thead>
    <tbody>";

foreach ($users as $u) {
  $name = trim((string)($u['first_name'] ?? '').' '.(string)($u['last_name'] ?? ''));
  $created = (int)($u['created_at'] ?? 0);
  $createdStr = $created > 0 ? date('Y-m-d H:i', $created) : '—';
  $sel = (int)$u['id'] === $userId ? "<span class='pill'>Selected</span>" : "<a class='btn' href='/admin/balance_adjust.php?user_id=".urlencode((string)$u['id'])."&q=".urlencode($q)."'>Select</a>";
  $body .= "<tr>
    <td>".h($u['id'])."</td>
    <td>".h($u['tg_id'] ?? '')."</td>
    <td>".h($u['username'] ? '@'.$u['username'] : '—')."</td>
    <td>".h($name !== '' ? $name : '—')."</td>
    <td>".h($u['locale'] ?? 'en')."</td>
    <td>".h($createdStr)."</td>
    <td>$sel</td>
  </tr>";
}

if (!$users) {
  $body .= "<tr><td colspan='7' class='muted'>No users found.</td></tr>";
}

$body .= "</tbody></table>
</div>";

admin_layout('Balance Adjust', $body);
