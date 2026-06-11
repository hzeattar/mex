<?php
/**
 * Cron: investment accrual / maturity payout.
 */
declare(strict_types=1);

require_once __DIR__ . '/api/lib/common.php';
require_once __DIR__ . '/api/lib/ledger.php';

function cron_input_token_it(): string {
  $web = trim((string)($_GET['token'] ?? $_GET['key'] ?? ''));
  if ($web !== '') return $web;
  if (PHP_SAPI === 'cli') {
    global $argv;
    foreach ((array)($argv ?? []) as $idx => $arg) {
      if ((int)$idx === 0) continue;
      $arg = trim((string)$arg);
      if ($arg === '') continue;
      if (str_starts_with($arg, 'token=')) return trim(substr($arg, 6));
      if (str_starts_with($arg, '--token=')) return trim(substr($arg, 8));
      if (str_starts_with($arg, 'key=')) return trim(substr($arg, 4));
      if (str_starts_with($arg, '--key=')) return trim(substr($arg, 6));
      return $arg;
    }
  }
  return '';
}

$token = cron_input_token_it();

$expected = env('CRON_KEY', '');
if ($expected !== '' && !hash_equals($expected, $token)) {
  json_response(['ok'=>false,'error'=>'Forbidden'], 403);
}

$pdo = db();
$now = time();
$run_day = (int)(floor($now / 86400) * 86400);
$limit = (int)($_GET['limit'] ?? 200);
if ($limit <= 0 || $limit > 500) $limit = 200;

function vp_invest_cycle_days(string $schedule): int {
  return match ($schedule) {
    'daily' => 1,
    'weekly' => 7,
    'monthly' => 30,
    default => 0,
  };
}

function vp_accrual_insert(PDO $pdo, int $invId, int $uid, float $amount, int $runDay, int $now, string $schedule): bool {
  if (!($amount > 0)) return false;
  $ins = $pdo->prepare(db_driver() === 'mysql'
    ? 'INSERT IGNORE INTO investment_accruals(investment_id,user_id,amount,ledger_id,run_at,created_at) VALUES (?,?,?,?,?,?)'
    : 'INSERT OR IGNORE INTO investment_accruals(investment_id,user_id,amount,ledger_id,run_at,created_at) VALUES (?,?,?,?,?,?)'
  );
  $ins->execute([$invId,$uid,$amount,null,$runDay,$now]);
  if ($ins->rowCount() <= 0) return false;
  $ledgerId = ledger_add($uid,'USDT',$amount,'invest_accrual','investment',(string)$invId,['run_at'=>$runDay,'schedule'=>$schedule]);
  $pdo->prepare('UPDATE investment_accruals SET ledger_id=? WHERE investment_id=? AND run_at=?')->execute([$ledgerId,$invId,$runDay]);
  $pdo->prepare('UPDATE investments SET paid_total = paid_total + ?, last_accrual_at=? WHERE id=?')->execute([$amount,$runDay,$invId]);
  return true;
}

$stmt = $pdo->prepare("SELECT i.*, p.roi_percent, p.term_days, COALESCE(p.product_kind,'plan') AS plan_product_kind, COALESCE(p.is_perpetual,0) AS plan_is_perpetual
  FROM investments i
  JOIN invest_plans p ON p.id=i.plan_id
  WHERE i.status='active'
  ORDER BY i.id ASC
  LIMIT {$limit}");
$stmt->execute();
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

$stats = ['checked'=>0,'accrued'=>0,'matured'=>0,'perpetual_live'=>0];

foreach ($rows as $inv) {
  $stats['checked']++;
  $invId = (int)($inv['id'] ?? 0);
  $uid = (int)($inv['user_id'] ?? 0);
  if ($invId <= 0 || $uid <= 0) continue;

  $schedule = strtolower((string)($inv['payout_schedule'] ?? 'end'));
  if (!in_array($schedule, ['daily','weekly','monthly','end'], true)) $schedule = 'end';

  $amount = (float)($inv['amount'] ?? 0);
  $expectedReturn = (float)($inv['expected_return'] ?? 0);
  $startAt = (int)($inv['start_at'] ?? 0);
  $endAt = (int)($inv['end_at'] ?? 0);
  $paidTotal = (float)($inv['paid_total'] ?? 0);
  $productKind = strtolower((string)($inv['product_kind'] ?? $inv['plan_product_kind'] ?? 'plan'));
  $isPerpetual = (int)($inv['is_perpetual'] ?? $inv['plan_is_perpetual'] ?? 0) === 1;

  if ($productKind === 'contract') {
    $cycleRoi = (float)($inv['cycle_roi_percent'] ?? $inv['roi_percent'] ?? 0);
    $cycleProfit = $amount * ($cycleRoi / 100.0);
    $cycleDays = vp_invest_cycle_days($schedule);
    $startDay = (int)(floor($startAt/86400)*86400);
    $endDay = $endAt > 0 ? (int)(floor($endAt/86400)*86400) : 0;

    if ($isPerpetual) $stats['perpetual_live']++;

    if ($schedule !== 'end' && $cycleDays > 0 && $cycleProfit > 0) {
      $firstDue = $startDay + ($cycleDays * 86400);
      $withinWindow = $run_day >= $firstDue && ($isPerpetual || $endDay === 0 || $run_day < $endDay);
      if ($withinWindow && (($run_day - $startDay) % ($cycleDays * 86400) === 0)) {
        try {
          $pdo->beginTransaction();
          if (db_driver() === 'mysql') {
            $pdo->prepare('SELECT id FROM investments WHERE id=? FOR UPDATE')->execute([$invId]);
          }
          if (vp_accrual_insert($pdo, $invId, $uid, $cycleProfit, $run_day, $now, $schedule)) {
            $stats['accrued']++;
          }
          $pdo->commit();
        } catch (Throwable $e) {
          if ($pdo->inTransaction()) $pdo->rollBack();
        }
      }
    }

    if (!$isPerpetual && $endAt > 0 && $endAt <= $now) {
      try {
        $pdo->beginTransaction();
        if (db_driver() === 'mysql') {
          $pdo->prepare('SELECT id,payout_ledger_id,paid_total FROM investments WHERE id=? FOR UPDATE')->execute([$invId]);
        }
        $cur = $pdo->prepare('SELECT payout_ledger_id, paid_total FROM investments WHERE id=?');
        $cur->execute([$invId]);
        $curRow = $cur->fetch(PDO::FETCH_ASSOC) ?: null;
        if (!$curRow || $curRow['payout_ledger_id']) { if ($pdo->inTransaction()) $pdo->rollBack(); continue; }
        $paidNow = (float)($curRow['paid_total'] ?? 0);
        $remaining = 0.0;
        if ($schedule === 'end') {
          $remaining = max(0, $expectedReturn - $paidNow);
        } else {
          $remaining = max(0, $amount);
        }
        $ledgerId = null;
        if ($remaining > 0) {
          $ledgerId = ledger_add($uid,'USDT',$remaining,'invest_payout','investment',(string)$invId,['schedule'=>$schedule,'product_kind'=>'contract']);
        }
        $pdo->prepare("UPDATE investments SET status='completed', payout_ledger_id=?, paid_total = paid_total + ? WHERE id=?")
          ->execute([$ledgerId, $remaining, $invId]);
        $pdo->commit();
        $stats['matured']++;
      } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
      }
    }
    continue;
  }

  $roi = (float)($inv['roi_percent'] ?? 0);
  $termDays = (int)($inv['term_days'] ?? 0);
  if ($schedule !== 'end') {
    $totalProfit = max(0.0, $amount * ($roi/100.0));
    if ($schedule === 'daily') {
      $accrualPerDay = ($termDays > 0) ? ($totalProfit / $termDays) : 0.0;
      if ($accrualPerDay > 0 && $run_day >= (int)(floor($startAt/86400)*86400) + 86400 && $run_day < (int)(floor($endAt/86400)*86400)) {
        try {
          $pdo->beginTransaction();
          if (db_driver() === 'mysql') $pdo->prepare('SELECT id FROM investments WHERE id=? FOR UPDATE')->execute([$invId]);
          if (vp_accrual_insert($pdo, $invId, $uid, $accrualPerDay, $run_day, $now, 'daily')) $stats['accrued']++;
          $pdo->commit();
        } catch (Throwable $e) {
          if ($pdo->inTransaction()) $pdo->rollBack();
        }
      }
    }
    if ($schedule === 'weekly') {
      $weeks = max(1, (int)ceil($termDays / 7));
      $accrualPerWeek = ($totalProfit / $weeks);
      $startDay = (int)(floor($startAt/86400)*86400);
      $endDay = (int)(floor($endAt/86400)*86400);
      if ($accrualPerWeek > 0 && $run_day >= $startDay + 7*86400 && $run_day < $endDay) {
        $diff = $run_day - $startDay;
        if ($diff % (7*86400) === 0) {
          try {
            $pdo->beginTransaction();
            if (db_driver() === 'mysql') $pdo->prepare('SELECT id FROM investments WHERE id=? FOR UPDATE')->execute([$invId]);
            if (vp_accrual_insert($pdo, $invId, $uid, $accrualPerWeek, $run_day, $now, 'weekly')) $stats['accrued']++;
            $pdo->commit();
          } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
          }
        }
      }
    }
  }

  if ($endAt > 0 && $endAt <= $now) {
    try {
      $pdo->beginTransaction();
      if (db_driver() === 'mysql') $pdo->prepare('SELECT id,payout_ledger_id,paid_total FROM investments WHERE id=? FOR UPDATE')->execute([$invId]);
      $cur = $pdo->prepare('SELECT payout_ledger_id, paid_total FROM investments WHERE id=?');
      $cur->execute([$invId]);
      $curRow = $cur->fetch(PDO::FETCH_ASSOC) ?: null;
      if (!$curRow || $curRow['payout_ledger_id']) { if ($pdo->inTransaction()) $pdo->rollBack(); continue; }
      $paidNow = (float)($curRow['paid_total'] ?? 0);
      $remaining = max(0, $expectedReturn - $paidNow);
      $ledgerId = null;
      if ($remaining > 0) {
        $ledgerId = ledger_add($uid,'USDT',$remaining,'invest_payout','investment',(string)$invId,['schedule'=>$schedule]);
      }
      $pdo->prepare("UPDATE investments SET status='completed', payout_ledger_id=?, paid_total = paid_total + ? WHERE id=?")
        ->execute([$ledgerId, $remaining, $invId]);
      $pdo->commit();
      $stats['matured']++;
    } catch (Throwable $e) {
      if ($pdo->inTransaction()) $pdo->rollBack();
    }
  }
}

$payload = ['ok'=>true,'run_day'=>$run_day,'stats'=>$stats];
try { tp_status_write('invest_tick', $payload); } catch (Throwable $e) {}
try { tp_log('cron','INFO','invest_tick', $payload); } catch (Throwable $e) {}
json_response($payload);
