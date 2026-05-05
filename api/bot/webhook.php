<?php
require_once __DIR__ . '/../lib/common.php';

header('Content-Type: application/json; charset=utf-8');

function envv($k,$d=''){ $v=getenv($k); return ($v===false||$v==='')?$d:$v; }
function tg_api($method, $payload){
  $token = envv('BOT_TOKEN','');
  if($token==='') return null;
  $url = "https://api.telegram.org/bot{$token}/{$method}";
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_CONNECTTIMEOUT => 8,
    CURLOPT_TIMEOUT => 18,
  ]);
  $out = curl_exec($ch);
  curl_close($ch);
  $j = json_decode($out, true);
  return $j;
}

function admin_chat_ids(){
  $raw = trim(envv('BOT_ADMIN_CHAT_IDS',''));
  if($raw==='') return [];
  $ids = array_filter(array_map('trim', explode(',', $raw)));
  return array_map('intval', $ids);
}
function is_admin_chat($chatId){
  return in_array((int)$chatId, admin_chat_ids(), true);
}

function get_user_by_id($userId){
  $db = db();
  // adjust table name/columns if yours differ (this matches earlier Laravel-ish fields but you also have sqlite miniapp users)
  $st = $db->prepare("SELECT id, telegram_id, telegram_username, telegram_first_name, telegram_last_name, uid FROM users WHERE id=? LIMIT 1");
  $st->execute([(int)$userId]);
  return $st->fetch(PDO::FETCH_ASSOC) ?: null;
}

function get_user_by_telegram($tgId){
  $db = db();
  $st = $db->prepare("SELECT id, telegram_id, telegram_username, telegram_first_name, telegram_last_name, uid FROM users WHERE telegram_id=? LIMIT 1");
  $st->execute([(string)$tgId]);
  return $st->fetch(PDO::FETCH_ASSOC) ?: null;
}

function find_intent($token){
  $db = db();
  $st = $db->prepare("SELECT * FROM bot_intents WHERE token=? LIMIT 1");
  $st->execute([$token]);
  return $st->fetch(PDO::FETCH_ASSOC) ?: null;
}

function set_intent_status($token, $status, $methodId=null){
  $db = db();
  $st = $db->prepare("UPDATE bot_intents SET status=?, method_id=COALESCE(?, method_id) WHERE token=?");
  $st->execute([$status, $methodId, $token]);
}

function active_methods(){
  $db = db();
  $st = $db->query("SELECT id, name, details FROM payment_methods WHERE is_active=1 ORDER BY sort ASC, id ASC");
  return $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
}

function create_deposit_request($userId, $amount, $methodId, $fileId, $proofMsgId){
  $db = db();
  $now = time();
  $st = $db->prepare("INSERT INTO deposit_requests(user_id,amount,method_id,proof_file_id,proof_message_id,status,created_at,updated_at)
                      VALUES(?,?,?,?,?,'pending',?,?)");
  $st->execute([(int)$userId,(float)$amount,(int)$methodId,(string)$fileId,(int)$proofMsgId,$now,$now]);
  return (int)$db->lastInsertId();
}

function set_deposit_status($reqId, $status, $adminChatId=null, $adminBy=null, $note=null){
  $db = db();
  $now = time();
  $st = $db->prepare("UPDATE deposit_requests
                      SET status=?, admin_chat_id=COALESCE(?,admin_chat_id), admin_by=COALESCE(?,admin_by),
                          admin_note=COALESCE(?,admin_note), updated_at=?
                      WHERE id=?");
  $st->execute([$status,$adminChatId,$adminBy,$note,$now,(int)$reqId]);
}

function get_deposit($reqId){
  $db = db();
  $st = $db->prepare("SELECT * FROM deposit_requests WHERE id=? LIMIT 1");
  $st->execute([(int)$reqId]);
  return $st->fetch(PDO::FETCH_ASSOC) ?: null;
}

/**
 * Apply deposit to wallet (robust-ish without knowing your exact schema).
 * If you already have a wallet ledger helper, it will use it.
 */
function apply_wallet_deposit($userId, $amount, $meta=[]){
  // Prefer existing helper if your codebase has it:
  if (function_exists('wallet_credit_primary')) {
    return wallet_credit_primary((int)$userId, (float)$amount, $meta);
  }

  $db = db();
  $amount = (float)$amount;

  // Try detect a ledger-like table
  $tables = $db->query("SELECT name FROM sqlite_master WHERE type='table'")->fetchAll(PDO::FETCH_COLUMN);
  $cand = [];
  foreach($tables as $t){
    if (stripos($t,'ledger') !== false) $cand[] = $t;
  }
  $cand = array_values(array_unique(array_merge($cand, ['wallet_ledger','ledger_entries','wallet_transactions'])));

  $ledgerTable = null;
  $cols = [];
  foreach($cand as $t){
    if(!in_array($t,$tables,true)) continue;
    $info = $db->query("PRAGMA table_info($t)")->fetchAll(PDO::FETCH_ASSOC);
    $names = array_map(fn($r)=>$r['name'],$info);
    $hasUser = in_array('user_id',$names,true);
    $hasAmt  = in_array('amount',$names,true) || in_array('delta',$names,true);
    $hasWal  = in_array('wallet',$names,true) || in_array('currency',$names,true);
    if($hasUser && $hasAmt && $hasWal){
      $ledgerTable = $t;
      $cols = $names;
      break;
    }
  }

  if($ledgerTable){
    $ref = 'BOT_DEP_' . bin2hex(random_bytes(6));
    $now = time();
    $metaJson = json_encode($meta, JSON_UNESCAPED_UNICODE);

    // Insert compatible row
    if(in_array('amount',$cols,true)){
      $walletCol = in_array('wallet',$cols,true) ? 'wallet' : 'currency';
      $typeCol = in_array('type',$cols,true) ? 'type' : (in_array('kind',$cols,true) ? 'kind' : null);
      $metaCol = in_array('meta',$cols,true) ? 'meta' : (in_array('details',$cols,true) ? 'details' : null);
      $refCol  = in_array('ref',$cols,true) ? 'ref' : null;
      $tsCol   = in_array('created_at',$cols,true) ? 'created_at' : (in_array('ts',$cols,true) ? 'ts' : null);

      $fields = ['user_id', $walletCol, 'amount'];
      $vals   = [(int)$userId, 'primary', $amount];

      if($typeCol){ $fields[]=$typeCol; $vals[]='deposit'; }
      if($refCol){ $fields[]=$refCol; $vals[]=$ref; }
      if($metaCol){ $fields[]=$metaCol; $vals[]=$metaJson; }
      if($tsCol){ $fields[]=$tsCol; $vals[]=$now; }

      $q = "INSERT INTO {$ledgerTable}(".implode(',',$fields).") VALUES(".implode(',', array_fill(0,count($fields),'?')).")";
      $st = $db->prepare($q);
      $st->execute($vals);
      return true;
    }
  }

  // Fallback: do nothing (better than corrupting balances)
  // You can wire this to your existing ledger system later if table name differs.
  return false;
}

$update = json_decode(file_get_contents('php://input'), true) ?: [];

try {
  // 1) /start dep_TOKEN
  if (!empty($update['message'])) {
    $msg = $update['message'];
    $chatId = (int)($msg['chat']['id'] ?? 0);
    $fromId = (int)($msg['from']['id'] ?? 0);
    $text = trim($msg['text'] ?? '');

    // Photo proof
    if (!empty($msg['photo']) && $chatId && $fromId) {
      $u = get_user_by_telegram($fromId);
      if(!$u){ tg_api('sendMessage',['chat_id'=>$chatId,'text'=>"❌ Account not linked. Open the mini app first."]); echo json_encode(['ok'=>true]); exit; }

      // Find latest intent awaiting proof for this user
      $db = db();
      $st = $db->prepare("SELECT * FROM bot_intents WHERE user_id=? AND kind='deposit' AND status='await_proof' ORDER BY created_at DESC LIMIT 1");
      $st->execute([(int)$u['id']]);
      $intent = $st->fetch(PDO::FETCH_ASSOC);

      if(!$intent){
        tg_api('sendMessage',['chat_id'=>$chatId,'text'=>"⚠️ No active deposit session. يرجى الرجوع للمنصة وبدء الإيداع."]);
        echo json_encode(['ok'=>true]); exit;
      }

      $photos = $msg['photo'];
      $best = end($photos);
      $fileId = $best['file_id'] ?? '';
      $proofMsgId = (int)($msg['message_id'] ?? 0);

      $reqId = create_deposit_request((int)$u['id'], (float)$intent['amount'], (int)$intent['method_id'], $fileId, $proofMsgId);
      set_intent_status($intent['token'], 'submitted');

      tg_api('sendMessage',[
        'chat_id'=>$chatId,
        'text'=>"✅ تم استلام صورة التأكيد.\nسيقوم الأدمن بالمراجعة والموافقة."
      ]);

      // Notify admins with approve/reject buttons
      $methods = active_methods();
      $methodName = '';
      foreach($methods as $m){ if((int)$m['id']===(int)$intent['method_id']){ $methodName=$m['name']; break; } }
      $name = trim(($u['telegram_first_name'] ?? '').' '.($u['telegram_last_name'] ?? ''));
      $uname = $u['telegram_username'] ? '@'.$u['telegram_username'] : '';
      $uid = $u['uid'] ?? '';

      $caption =
        "📥 *New Deposit Request*\n".
        "User: ".($name?:'—')." {$uname}\n".
        "UID: {$uid}\n".
        "Amount: *".number_format((float)$intent['amount'],2)." USD*\n".
        "Method: *".($methodName?:('ID '.$intent['method_id']))."*\n".
        "ReqID: `{$reqId}`";

      $kb = json_encode([
        'inline_keyboard'=>[
          [
            ['text'=>'✅ Approve', 'callback_data'=>"dep_appr:{$reqId}"],
            ['text'=>'❌ Reject',  'callback_data'=>"dep_rej:{$reqId}"],
          ]
        ]
      ]);

      foreach(admin_chat_ids() as $aid){
        tg_api('sendPhoto',[
          'chat_id'=>$aid,
          'photo'=>$fileId,
          'caption'=>$caption,
          'parse_mode'=>'Markdown',
          'reply_markup'=>$kb
        ]);
      }

      echo json_encode(['ok'=>true]); exit;
    }

    if (preg_match('~^/start\s+(\S+)~', $text, $m)) {
      $start = trim($m[1]);
      if (str_starts_with($start, 'dep_')) {
        $token = substr($start, 4);
        $intent = find_intent($token);
        if(!$intent){ tg_api('sendMessage',['chat_id'=>$chatId,'text'=>"❌ Invalid or expired session."]); echo json_encode(['ok'=>true]); exit; }
        if(time() > (int)$intent['expires_at']){ set_intent_status($token,'expired'); tg_api('sendMessage',['chat_id'=>$chatId,'text'=>"⌛ Session expired. ارجع للمنصة وابدأ تاني."]); echo json_encode(['ok'=>true]); exit; }

        // Security: ensure this start link belongs to same telegram user
        $u = get_user_by_id((int)$intent['user_id']);
        if(!$u || (string)$u['telegram_id'] !== (string)$fromId){
          tg_api('sendMessage',['chat_id'=>$chatId,'text'=>"❌ Unauthorized session."]);
          echo json_encode(['ok'=>true]); exit;
        }

        set_intent_status($token,'await_method');

        $methods = active_methods();
        if(!$methods){
          tg_api('sendMessage',['chat_id'=>$chatId,'text'=>"⚠️ لا توجد وسائل إيداع مفعلة حالياً."]);
          echo json_encode(['ok'=>true]); exit;
        }

        $rows = [];
        foreach($methods as $mm){
          $rows[] = [[ 'text'=>$mm['name'], 'callback_data'=>"dep_m:{$token}:{$mm['id']}" ]];
        }
        $rows[] = [[ 'text'=>"Cancel", 'callback_data'=>"dep_cancel:{$token}" ]];

        tg_api('sendMessage',[
          'chat_id'=>$chatId,
          'text'=>"💳 Deposit Amount: *".number_format((float)$intent['amount'],2)." USD*\nاختر وسيلة الإيداع:",
          'parse_mode'=>'Markdown',
          'reply_markup'=> json_encode(['inline_keyboard'=>$rows])
        ]);

        echo json_encode(['ok'=>true]); exit;
      }
    }
  }

  // 2) Callbacks (choose method / approve / reject / cancel)
  if (!empty($update['callback_query'])) {
    $cq = $update['callback_query'];
    $data = (string)($cq['data'] ?? '');
    $chatId = (int)($cq['message']['chat']['id'] ?? 0);
    $fromId = (int)($cq['from']['id'] ?? 0);
    $msgId  = (int)($cq['message']['message_id'] ?? 0);

    // choose method: dep_m:TOKEN:ID
    if (preg_match('~^dep_m:([a-f0-9]{32}):(\d+)$~', $data, $m)) {
      $token = $m[1]; $mid = (int)$m[2];
      $intent = find_intent($token);
      if(!$intent){ tg_api('answerCallbackQuery',['callback_query_id'=>$cq['id'],'text'=>'Invalid']); echo json_encode(['ok'=>true]); exit; }

      $u = get_user_by_id((int)$intent['user_id']);
      if(!$u || (string)$u['telegram_id'] !== (string)$fromId){
        tg_api('answerCallbackQuery',['callback_query_id'=>$cq['id'],'text'=>'Unauthorized']); echo json_encode(['ok'=>true]); exit;
      }

      set_intent_status($token, 'await_proof', $mid);

      $methods = active_methods();
      $picked = null;
      foreach($methods as $mm){ if((int)$mm['id']===$mid){ $picked=$mm; break; } }
      if(!$picked){ tg_api('answerCallbackQuery',['callback_query_id'=>$cq['id'],'text'=>'Method not available']); echo json_encode(['ok'=>true]); exit; }

      tg_api('answerCallbackQuery',['callback_query_id'=>$cq['id'],'text'=>'Selected']);
      tg_api('sendMessage',[
        'chat_id'=>$chatId,
        'text'=>"✅ Method: *{$picked['name']}*\n\n{$picked['details']}\n\n📸 ابعت صورة التحويل هنا (Proof).",
        'parse_mode'=>'Markdown'
      ]);

      echo json_encode(['ok'=>true]); exit;
    }

    // cancel
    if (preg_match('~^dep_cancel:([a-f0-9]{32})$~', $data, $m)) {
      $token = $m[1];
      $intent = find_intent($token);
      if($intent){
        $u = get_user_by_id((int)$intent['user_id']);
        if($u && (string)$u['telegram_id']===(string)$fromId){
          set_intent_status($token,'cancelled');
        }
      }
      tg_api('answerCallbackQuery',['callback_query_id'=>$cq['id'],'text'=>'Cancelled']);
      tg_api('editMessageText',['chat_id'=>$chatId,'message_id'=>$msgId,'text'=>"❌ Cancelled"]);
      echo json_encode(['ok'=>true]); exit;
    }

    // approve / reject (admins only)
    if (preg_match('~^dep_appr:(\d+)$~', $data, $m)) {
      if(!is_admin_chat($chatId)){
        tg_api('answerCallbackQuery',['callback_query_id'=>$cq['id'],'text'=>'Admins only']); echo json_encode(['ok'=>true]); exit;
      }
      $reqId = (int)$m[1];
      $dep = get_deposit($reqId);
      if(!$dep || $dep['status']!=='pending'){
        tg_api('answerCallbackQuery',['callback_query_id'=>$cq['id'],'text'=>'Not pending']); echo json_encode(['ok'=>true]); exit;
      }

      $ok = apply_wallet_deposit((int)$dep['user_id'], (float)$dep['amount'], ['source'=>'telegram_bot','deposit_request_id'=>$reqId]);
      set_deposit_status($reqId, 'approved', $chatId, $fromId, $ok ? 'Applied' : 'Needs wiring');
      tg_api('answerCallbackQuery',['callback_query_id'=>$cq['id'],'text'=>'Approved']);

      tg_api('editMessageCaption',[
        'chat_id'=>$chatId,
        'message_id'=>$msgId,
        'caption'=>"✅ APPROVED • ReqID {$reqId}",
      ]);

      // Notify user
      $u = get_user_by_id((int)$dep['user_id']);
      if($u && !empty($u['telegram_id'])){
        tg_api('sendMessage',[
          'chat_id'=>(int)$u['telegram_id'],
          'text'=>"✅ Deposit approved: ".number_format((float)$dep['amount'],2)." USD"
        ]);
      }

      echo json_encode(['ok'=>true]); exit;
    }

    if (preg_match('~^dep_rej:(\d+)$~', $data, $m)) {
      if(!is_admin_chat($chatId)){
        tg_api('answerCallbackQuery',['callback_query_id'=>$cq['id'],'text'=>'Admins only']); echo json_encode(['ok'=>true]); exit;
      }
      $reqId = (int)$m[1];
      $dep = get_deposit($reqId);
      if(!$dep || $dep['status']!=='pending'){
        tg_api('answerCallbackQuery',['callback_query_id'=>$cq['id'],'text'=>'Not pending']); echo json_encode(['ok'=>true]); exit;
      }

      set_deposit_status($reqId, 'rejected', $chatId, $fromId, 'Rejected');
      tg_api('answerCallbackQuery',['callback_query_id'=>$cq['id'],'text'=>'Rejected']);
      tg_api('editMessageCaption',[
        'chat_id'=>$chatId,
        'message_id'=>$msgId,
        'caption'=>"❌ REJECTED • ReqID {$reqId}",
      ]);

      $u = get_user_by_id((int)$dep['user_id']);
      if($u && !empty($u['telegram_id'])){
        tg_api('sendMessage',[
          'chat_id'=>(int)$u['telegram_id'],
          'text'=>"❌ Deposit rejected: ReqID {$reqId}"
        ]);
      }

      echo json_encode(['ok'=>true]); exit;
    }
  }

  echo json_encode(['ok'=>true]);
} catch(Throwable $e){
  // don't break webhook
  echo json_encode(['ok'=>true,'err'=>$e->getMessage()]);
}
