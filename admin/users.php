<?php
require_once __DIR__ . '/includes/auth.php';
admin_require();

$pdo = db();
$msg = null; $err = null;

$action = (string)($_POST['action'] ?? '');

// Set per-user forced account mode
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'mode_set') {
  $userId = (int)($_POST['user_id'] ?? 0);
  $mode = strtolower(trim((string)($_POST['force_mode'] ?? '')));
  $forceMode = in_array($mode, ['demo','real'], true) ? $mode : null;
  try {
    if (function_exists('admin_verify_csrf')) admin_verify_csrf();
    if ($forceMode === null) {
      $pdo->prepare('UPDATE users SET force_mode=NULL, updated_at=? WHERE id=?')->execute([time(), $userId]);
    } else {
      $pdo->prepare('UPDATE users SET force_mode=?, updated_at=? WHERE id=?')->execute([$forceMode, time(), $userId]);
    }
    if (function_exists('admin_audit_log')) admin_audit_log('mode_set', 'user', $userId, 'Updated forced account mode', ['force_mode'=>$forceMode]);
    $msg = 'Saved account mode override.';
  } catch (Throwable $e) {
    $err = $e->getMessage();
  }
}

// Set per-user leverage cap
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'lev_set') {
  $userId = (int)($_POST['user_id'] ?? 0);
  $v = trim((string)($_POST['max_leverage'] ?? ''));
  $maxLev = null;
  if ($v !== '') $maxLev = max(1, min(1000, (int)$v));
  try {
    if (function_exists('admin_verify_csrf')) admin_verify_csrf();
    if ($maxLev === null) {
      $pdo->prepare('UPDATE users SET max_leverage=NULL WHERE id=?')->execute([$userId]);
    } else {
      $pdo->prepare('UPDATE users SET max_leverage=? WHERE id=?')->execute([$maxLev, $userId]);
    }
    $msg = 'Saved leverage cap.';
  } catch (Throwable $e) {
    $err = $e->getMessage();
  }
}

// Freeze / unfreeze
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'freeze_toggle') {
  $userId = (int)($_POST['user_id'] ?? 0);
  $freeze = (int)($_POST['freeze'] ?? 0) === 1;
  $reason = trim((string)($_POST['reason'] ?? ''));
  try {
    if (function_exists('admin_verify_csrf')) admin_verify_csrf();
    if ($freeze) {
      $pdo->prepare('UPDATE users SET is_frozen=1,frozen_reason=?,frozen_at=?,frozen_by=?,updated_at=? WHERE id=?')
          ->execute([$reason, time(), 0, time(), $userId]);
      $msg = 'User frozen.';
    } else {
      $pdo->prepare('UPDATE users SET is_frozen=0,frozen_reason=NULL,frozen_at=NULL,frozen_by=NULL,updated_at=? WHERE id=?')
          ->execute([time(), $userId]);
      $msg = 'User unfrozen.';
    }
  } catch (Throwable $e) {
    $err = $e->getMessage();
  }
}

// Toggle flags
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'flag_toggle') {
  $userId = (int)($_POST['user_id'] ?? 0);
  $field = (string)($_POST['field'] ?? '');
  if (in_array($field, ['deposit_disabled','withdraw_disabled','trade_disabled'], true)) {
    try {
      if (function_exists('admin_verify_csrf')) admin_verify_csrf();
      $pdo->prepare("UPDATE users SET {$field}=CASE WHEN COALESCE({$field},0)=1 THEN 0 ELSE 1 END, updated_at=? WHERE id=?")
          ->execute([time(), $userId]);
      $msg = 'Updated.';
    } catch (Throwable $e) {
      $err = $e->getMessage();
    }
  }
}

// Load users (try with new columns, fallback)
$rows = [];
try {
  $stmt = $pdo->query('SELECT id,tg_id,telegram_chat_id,email,username,first_name,last_name,locale,max_leverage,force_mode,manager_id,is_frozen,frozen_reason,deposit_disabled,withdraw_disabled,trade_disabled,created_at FROM users ORDER BY id DESC LIMIT 200');
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
} catch (Throwable $e) {
  try {
    $stmt = $pdo->query('SELECT id,tg_id,telegram_chat_id,email,username,first_name,last_name,locale,max_leverage,force_mode,created_at FROM users ORDER BY id DESC LIMIT 200');
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
  } catch (Throwable $e2) {
    $stmt = $pdo->query('SELECT id,tg_id,telegram_chat_id,email,username,first_name,last_name,locale,created_at FROM users ORDER BY id DESC LIMIT 200');
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
  }
  foreach ($rows as &$r) {
    $r['locale'] = $r['locale'] ?? 'en';
    $r['max_leverage'] = $r['max_leverage'] ?? null;
    $r['manager_id'] = $r['manager_id'] ?? 0;
    $r['force_mode'] = $r['force_mode'] ?? '';
    $r['is_frozen'] = $r['is_frozen'] ?? 0;
    $r['frozen_reason'] = $r['frozen_reason'] ?? '';
    $r['deposit_disabled'] = $r['deposit_disabled'] ?? 0;
    $r['withdraw_disabled'] = $r['withdraw_disabled'] ?? 0;
    $r['trade_disabled'] = $r['trade_disabled'] ?? 0;
  }
  unset($r);
}

function esc($s){ return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

$body = "<div class='card'><h2>Users</h2>";
if ($msg) $body .= "<div class='ok'>".esc($msg)."</div>";
if ($err) $body .= "<div class='err'>".esc($err)."</div>";

$body .= "<table><thead><tr>".
  "<th>ID</th><th>Email</th><th>Telegram ID</th><th>Chat ID</th><th>Name</th><th>Username</th><th>Locale</th><th>Manager</th><th>Status</th><th>Mode</th><th>Max Lev</th><th>Created</th><th>Actions</th>".
  "</tr></thead><tbody>";

foreach ($rows as $r) {
  $id = (int)($r['id'] ?? 0);
  $name = esc(trim(($r['first_name'] ?? '').' '.($r['last_name'] ?? '')));
  $uname = esc((string)($r['username'] ?? ''));
  $managerId = (int)($r['manager_id'] ?? 0);

  $isFrozen = (int)($r['is_frozen'] ?? 0) === 1;
  $flags = [];
  if ($isFrozen) $flags[] = 'Frozen';
  if ((int)($r['deposit_disabled'] ?? 0) === 1) $flags[] = 'Deposit disabled';
  if ((int)($r['withdraw_disabled'] ?? 0) === 1) $flags[] = 'Withdraw disabled';
  if ((int)($r['trade_disabled'] ?? 0) === 1) $flags[] = 'Trade disabled';
  $statusHtml = $flags ? "<span class='pill bad'>".esc(implode(' | ', $flags))."</span>" : "<span class='pill ok'>active</span>";

  $levVal = ($r['max_leverage'] ?? null);
  $levShow = ($levVal === null || $levVal === '' || (int)$levVal <= 0) ? '' : (string)(int)$levVal;

  $levForm = $id ? (
    "<form method='post' style='display:flex;gap:8px;align-items:center'>".
      "<input type='hidden' name='action' value='lev_set'>".
      (function_exists('admin_csrf_input')?admin_csrf_input():'').
      "<input type='hidden' name='user_id' value='{$id}'>".
      "<input type='number' name='max_leverage' min='1' max='1000' step='1' value='".esc($levShow)."' placeholder='global' style='width:92px'>".
      "<button class='btn' type='submit'>Save</button>".
    "</form>"
  ) : '';

  $freezeForm = $id ? (
    "<form method='post' style='display:flex;gap:6px;align-items:center;margin-top:6px'>".
      "<input type='hidden' name='action' value='freeze_toggle'>".
      (function_exists('admin_csrf_input')?admin_csrf_input():'').
      "<input type='hidden' name='user_id' value='{$id}'>".
      "<input type='hidden' name='freeze' value='".($isFrozen?0:1)."'>".
      "<input name='reason' value='".esc((string)($r['frozen_reason'] ?? ''))."' placeholder='reason' style='width:140px'>".
      "<button class='btn ".($isFrozen?'':'danger')."' type='submit'>".($isFrozen?'Unfreeze':'Freeze')."</button>".
    "</form>"
  ) : '';

  $toggles = $id ? (
    "<form method='post' style='display:flex;gap:6px;align-items:center;margin-top:6px'>".
      "<input type='hidden' name='action' value='flag_toggle'>".
      (function_exists('admin_csrf_input')?admin_csrf_input():'').
      "<input type='hidden' name='user_id' value='{$id}'>".
      "<button class='btn' name='field' value='deposit_disabled' type='submit'>Dep</button>".
      "<button class='btn' name='field' value='withdraw_disabled' type='submit'>Wdr</button>".
      "<button class='btn' name='field' value='trade_disabled' type='submit'>Trade</button>".
    "</form>"
  ) : '';

  $forceMode = strtolower((string)($r['force_mode'] ?? ''));
  $modeForm = $id ? (
    "<form method='post' style='display:flex;gap:8px;align-items:center'>".
      (function_exists('admin_csrf_input')?admin_csrf_input():'').
      "<input type='hidden' name='action' value='mode_set'>".
      "<input type='hidden' name='user_id' value='{$id}'>".
      "<select name='force_mode'>".
        "<option value='' ".($forceMode===''?'selected':'').">User choice</option>".
        "<option value='demo' ".($forceMode==='demo'?'selected':'').">Force Demo</option>".
        "<option value='real' ".($forceMode==='real'?'selected':'').">Force Real</option>".
      "</select>".
      "<button class='btn' type='submit'>Save</button>".
    "</form>"
  ) : '';


  $act = '';
  if ($id) {
    $act .= "<a class='btn' href='/admin/balance_adjust.php?user_id={$id}'>Adjust</a> ";
    $act .= "<a class='btn' href='/admin/message_user.php?user_id={$id}'>Message</a>";
  }

  $body .= "<tr>".
    "<td>{$id}</td>".
    "<td>".esc((string)($r['email'] ?? ''))."</td>".
    "<td>".esc((string)($r['tg_id'] ?? ''))."</td>".
    "<td>".esc((string)($r['telegram_chat_id'] ?? ''))."</td>".
    "<td>{$name}</td>".
    "<td>{$uname}</td>".
    "<td>".esc((string)($r['locale'] ?? ''))."</td>".
    "<td>".esc($managerId ? (string)$managerId : '—')."</td>".
    "<td>{$statusHtml}{$freezeForm}{$toggles}</td>".
    "<td>{$modeForm}</td>".
    "<td>{$levForm}</td>".
    "<td>".date('Y-m-d H:i',(int)($r['created_at'] ?? 0))."</td>".
    "<td>{$act}</td>".
  "</tr>";
}

$body .= "</tbody></table></div>";
admin_layout('Users', $body);
