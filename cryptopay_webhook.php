<?php
declare(strict_types=1);

/**
 * Crypto Pay API webhook handler.
 * URL (Option A): https://mexgroup.com/bot/cryptopay_webhook.php?secret=YOUR_SECRET
 */

header('Content-Type: application/json; charset=utf-8');

function cp_log(string $msg): void {
  error_log('[cryptopay_webhook] ' . $msg);
}

try {
  require_once __DIR__ . '/api/lib/common.php';
  require_once __DIR__ . '/api/lib/schema.php';
  require_once __DIR__ . '/api/lib/ledger.php';
  require_once __DIR__ . '/api/lib/cryptopay.php';

  // Optional extra protection (query secret). We primarily trust Crypto Pay signature verification.
  // This makes the webhook resilient if the configured URL secret wasn't updated after a deployment.
  $expectedSecret = (string)env('CRYPTO_PAY_WEBHOOK_SECRET', '');
  $secret = (string)($_GET['secret'] ?? '');
  if ($expectedSecret !== '' && $secret !== '' && !hash_equals($expectedSecret, $secret)) {
    cp_log('WARN: webhook secret mismatch (continuing; signature check will decide)');
  }

  $raw = file_get_contents('php://input') ?: '';
try { tp_log('cryptopay','INFO','incoming_raw', ['len'=>strlen((string)$raw)]); } catch (Throwable $e) {}
  if ($raw === '') {
    echo json_encode(['ok'=>false,'error'=>'Empty body']);
    exit;
  }

  if (!cryptopay_verify_signature($raw, $_SERVER)) {
    echo json_encode(['ok'=>false,'error'=>'Bad signature']);
    exit;
  }

  $upd = json_decode($raw, true);
  if (!is_array($upd)) {
    echo json_encode(['ok'=>false,'error'=>'Bad JSON']);
    exit;
  }

  $type = (string)($upd['update_type'] ?? '');
  $invoice = $upd['payload'] ?? null;
  if (!is_array($invoice)) {
    echo json_encode(['ok'=>true]);
    exit;
  }

  // We only need invoice_paid for auto-credit.
  if ($type !== 'invoice_paid') {
    echo json_encode(['ok'=>true,'ignored'=>$type]);
    exit;
  }

  $payload = (string)($invoice['payload'] ?? '');
  $invoiceId = (int)($invoice['invoice_id'] ?? 0);

  $depId = 0;
  if (preg_match('/^dep:(\d+)$/', $payload, $m)) {
    $depId = (int)$m[1];
  }
  if ($depId <= 0) {
    // Fallback: try to find by invoice_id inside external_ref json/text
    if ($invoiceId > 0) {
      try {
        $st = db()->prepare("SELECT id FROM deposits WHERE provider='cryptopay' AND external_ref LIKE ? ORDER BY id DESC LIMIT 1");
        $st->execute(['%"invoice_id":' . $invoiceId . '%']);
        $depId = (int)($st->fetchColumn() ?: 0);
      } catch (Throwable $e) {}
    }
  }
  if ($depId <= 0) {
    cp_log('No deposit id for invoice ' . $invoiceId);
    echo json_encode(['ok'=>true]);
    exit;
  }

  $pdo = db();
  $pdo->beginTransaction();
  try {
    $st = $pdo->prepare('SELECT * FROM deposits WHERE id=? LIMIT 1 FOR UPDATE');
    if (db_driver() !== 'mysql') {
      $st = $pdo->prepare('SELECT * FROM deposits WHERE id=? LIMIT 1');
    }
    $st->execute([$depId]);
    $dep = $st->fetch(PDO::FETCH_ASSOC);
    if (!$dep) throw new RuntimeException('Deposit not found');

    if ((string)($dep['status'] ?? '') !== 'pending') {
      $pdo->commit();
      echo json_encode(['ok'=>true,'status'=>$dep['status']]);
      exit;
    }

    $uid = (int)($dep['user_id'] ?? 0);
    $currency = strtoupper((string)($dep['currency'] ?? 'USDT'));
    $amount = (float)($dep['amount'] ?? 0);
    if ($uid <= 0 || !($amount > 0)) throw new RuntimeException('Bad deposit');

    // Idempotence: skip if ledger already has this deposit ref
    $chk = $pdo->prepare("SELECT 1 FROM ledger_entries WHERE ref_type='deposit' AND ref_id=? LIMIT 1");
    $chk->execute([(string)$depId]);
    $already = (int)($chk->fetchColumn() ?: 0);
    if ($already === 0) {
      ledger_add($uid, $currency, $amount, 'deposit_credit', 'deposit', (string)$depId, [
        'provider' => 'cryptopay',
        'invoice_id' => $invoiceId,
        'paid_asset' => (string)($invoice['paid_asset'] ?? ($invoice['asset'] ?? '')),
        'paid_amount' => (string)($invoice['paid_amount'] ?? ''),
      ]);
    }

    // Update external_ref json with paid info
    $ext = (string)($dep['external_ref'] ?? '');
    $meta = [];
    if ($ext !== '') {
      $tmp = json_decode($ext, true);
      if (is_array($tmp)) $meta = $tmp;
    }
    $meta['invoice_id'] = $invoiceId;
    $meta['paid_at'] = time();
    $meta['paid_asset'] = (string)($invoice['paid_asset'] ?? ($invoice['asset'] ?? ''));
    $meta['paid_amount'] = (string)($invoice['paid_amount'] ?? ($invoice['amount'] ?? ''));
    $meta['status'] = 'paid';

    $now = time();
    $pdo->prepare('UPDATE deposits SET status="confirmed", updated_at=?, confirmed_at=?, external_ref=? WHERE id=?')
      ->execute([$now, $now, json_encode($meta, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES), $depId]);

    $pdo->commit();

    // Notify user in Telegram (best-effort)
    try {
      $chatId = (int)($meta['chat_id'] ?? 0);
      $lang = (string)($meta['lang'] ?? 'en');
      if ($chatId > 0 && (string)env('BOT_TOKEN','') !== '') {
        $txt = ($lang==='ar')
          ? "✅ تم تأكيد الإيداع #{$depId} وإضافة الرصيد." 
          : ($lang==='ru' ? "✅ Пополнение #{$depId} подтверждено, баланс обновлён." : "✅ Deposit #{$depId} confirmed, balance updated.");

        $url = "https://api.telegram.org/bot".(string)env('BOT_TOKEN','')."/sendMessage";
        $ch = curl_init($url);
        curl_setopt_array($ch,[
          CURLOPT_RETURNTRANSFER=>true,
          CURLOPT_POST=>true,
          CURLOPT_POSTFIELDS=>json_encode(['chat_id'=>$chatId,'text'=>$txt], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),
          CURLOPT_HTTPHEADER=>['Content-Type: application/json'],
          CURLOPT_TIMEOUT=>8,
        ]);
        curl_exec($ch);
        curl_close($ch);
      }
    } catch (Throwable $e) {}

    echo json_encode(['ok'=>true,'status'=>'confirmed']);
    exit;
  } catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    cp_log('ERR: '.$e->getMessage());
    echo json_encode(['ok'=>false,'error'=>$e->getMessage()]);
    exit;
  }
} catch (Throwable $e) {
  cp_log('FATAL: '.$e->getMessage());
  echo json_encode(['ok'=>true]);
}
