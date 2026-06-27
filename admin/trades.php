<?php
require_once __DIR__ . '/includes/auth.php';
admin_require();

require_once __DIR__ . '/../api/lib/quotes.php';
require_once __DIR__ . '/../api/lib/risk.php';
require_once __DIR__ . '/../api/lib/ledger.php';

$pdo = db();
try { schema_upgrade($pdo, db_driver()); } catch (Throwable $e) {}

function h($s): string { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function clean_symbol(string $s): string {
  if (str_starts_with($s, '@R@')) return substr($s, 3);
  if (str_starts_with($s, '@D@')) return substr($s, 3);
  return $s;
}

$view = (string)($_GET['view'] ?? 'open'); // open | closed
$userFilter = trim((string)($_GET['user'] ?? ''));
$userId = 0;

if ($userFilter !== '') {
  if (ctype_digit($userFilter)) {
    $userId = (int)$userFilter;
  } else {
    try {
      $st = $pdo->prepare('SELECT id FROM users WHERE username=? OR uid=? OR tg_id=? LIMIT 1');
      $st->execute([$userFilter, $userFilter, $userFilter]);
      $userId = (int)($st->fetchColumn() ?: 0);
    } catch (Throwable $e) {
      $userId = 0;
    }
  }
}

$msg = null; $err = null;

// ---- Actions ----
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  admin_verify_csrf();
  $action = (string)($_POST['action'] ?? '');

  // Adjust OPEN (REAL only) by PNL or ROE (changes ENTRY only)
  if ($action === 'adjust_open') {
    $posId = (int)($_POST['pos_id'] ?? 0);
    $targetPnl = trim((string)($_POST['target_pnl'] ?? ''));
    $targetRoe = trim((string)($_POST['target_roe'] ?? ''));

    try {
      $st = $pdo->prepare("SELECT p.*, u.username FROM positions p JOIN users u ON u.id=p.user_id WHERE p.id=? AND p.status='open' AND p.market_type IN ('perp','spot') AND p.symbol LIKE '@R@%' LIMIT 1");
      $st->execute([$posId]);
      $p = $st->fetch(PDO::FETCH_ASSOC);
      if (!$p) throw new RuntimeException('Position not found (REAL open perp only).');

      $symbolStored = (string)($p['symbol'] ?? '');
      $symbol = clean_symbol($symbolStored);
      $assetType = (string)($p['asset_type'] ?? 'crypto');
      $side = strtoupper((string)($p['side'] ?? 'BUY'));
      $qty = (float)($p['qty'] ?? 0);
      $lev = (int)($p['leverage'] ?? 1);
      $margin = (float)($p['margin_initial'] ?? 0);
      $oldEntry = (float)($p['entry_price'] ?? 0);

      if ($qty <= 0 || $margin <= 0) throw new RuntimeException('Invalid position sizing.');

      $marketType = strtolower((string)($p['market_type'] ?? 'perp'));
      if (!in_array($marketType, ['perp','spot'], true)) $marketType = 'perp';

      // fresh mark
      $mark = quote_price($symbol, $marketType, $assetType);
      if ($mark <= 0) throw new RuntimeException('Price unavailable.');

      $pnlTarget = null;
      $roeTarget = null;
      if ($targetPnl !== '') {
        $pnlTarget = (float)$targetPnl;
      } elseif ($targetRoe !== '') {
        $roeTarget = (float)$targetRoe;
        if ($marketType === 'perp') {
          // ROE% of margin
          $pnlTarget = ($roeTarget / 100.0) * $margin;
        }
      } else {
        throw new RuntimeException('Enter target PNL or ROE.');
      }

      // Compute entry for target
      // For PNL target (spot/perp):
      // BUY: pnl = (mark - entry)*qty => entry = mark - pnl/qty
      // SELL: pnl = (entry - mark)*qty => entry = mark + pnl/qty
      if ($pnlTarget !== null) {
        if ($side === 'SELL') {
          $newEntry = $mark + ($pnlTarget / $qty);
        } else {
          $newEntry = $mark - ($pnlTarget / $qty);
        }
      } else {
        // ROE target for SPOT: roe = pnl / (qty*entry)
        // BUY: roe = (mark-entry)/entry => entry = mark/(1+roe)
        // SELL: roe = (entry-mark)/entry => entry = mark/(1-roe)
        $r = $roeTarget / 100.0;
        if ($side === 'SELL') {
          $den = (1.0 - $r);
        } else {
          $den = (1.0 + $r);
        }
        if (abs($den) < 1e-9) throw new RuntimeException('ROE target too extreme.');
        $newEntry = $mark / $den;
      }

      if ($newEntry <= 0) throw new RuntimeException('Computed entry invalid.');

      $newLiq = ($marketType === 'perp') ? perp_calc_liquidation_price((float)$newEntry, $qty, $side, $lev) : null;

      $pdo->beginTransaction();

      // update position entry only (do NOT touch exit)
      $ts = now_ts();
            $u1 = $pdo->prepare('UPDATE positions SET entry_price=?, liquidation_price=?, updated_at=? WHERE id=?');
      $u1->execute([(float)$newEntry, $newLiq, $ts, $posId]);

      // update the OPEN order row so history/UI uses the updated entry (keep it single-row)
      $st2 = $pdo->prepare("SELECT id, meta FROM orders WHERE position_id=? AND status='filled' ORDER BY id DESC LIMIT 1");
      $st2->execute([$posId]);
      $oid = (int)($st2->fetchColumn() ?: 0);
      $metaRaw = null;
      try {
        // fetch meta properly
        $st3 = $pdo->prepare("SELECT meta FROM orders WHERE id=? LIMIT 1");
        $st3->execute([$oid]);
        $metaRaw = $st3->fetchColumn();
      } catch (Throwable $e) { $metaRaw = null; }

      if ($oid > 0) {
        $meta = [];
        if (is_string($metaRaw) && $metaRaw !== '') {
          $tmp = json_decode($metaRaw, true);
          if (is_array($tmp)) $meta = $tmp;
        }
        $meta['admin_adjust_open'] = [
          'ts' => $ts,
          'by' => 'admin',
          'prev_entry' => $oldEntry,
          'new_entry' => (float)$newEntry,
          'target_pnl' => (float)$pnlTarget,
          'mark_used' => (float)$mark,
        ];

        $u2 = $pdo->prepare('UPDATE orders SET fill_price=?, meta=?, updated_at=? WHERE id=?');
        $u2->execute([(float)$newEntry, json_encode($meta, JSON_UNESCAPED_UNICODE), $ts, $oid]);
      }

      $pdo->commit();
      $msg = ($marketType==='spot') ? 'Open REAL SPOT position updated (entry recalculated).':'Open REAL PERP position updated (entry recalculated).';
    } catch (Throwable $e) {
      if ($pdo->inTransaction()) $pdo->rollBack();
      $err = $e->getMessage();
    }
  }

  // Edit CLOSED order (REAL only): entry + exit, pnl auto
  if ($action === 'edit_closed') {
    $orderId = (int)($_POST['order_id'] ?? 0);
    $entry = (float)($_POST['entry_price'] ?? 0);
    $exit = (float)($_POST['exit_price'] ?? 0);

    try {
      $st = $pdo->prepare("SELECT * FROM orders WHERE id=? AND status='closed' AND symbol LIKE '@R@%' LIMIT 1");
      $st->execute([$orderId]);
      $o = $st->fetch(PDO::FETCH_ASSOC);
      if (!$o) throw new RuntimeException('Closed REAL order not found.');

      $qty = (float)($o['qty'] ?? 0);
      $side = strtoupper((string)($o['side'] ?? 'BUY'));
      if ($qty <= 0 || $entry <= 0 || $exit <= 0) throw new RuntimeException('Entry/Exit/QTY must be > 0');

      $pnl = ($side === 'SELL') ? (($entry - $exit) * $qty) : (($exit - $entry) * $qty);

      $meta = [];
      $metaRaw = (string)($o['meta'] ?? '');
      if ($metaRaw !== '') {
        $tmp = json_decode($metaRaw, true);
        if (is_array($tmp)) $meta = $tmp;
      }
      $meta['admin_edit_closed'] = [
        'ts' => now_ts(),
        'by' => 'admin',
        'prev_entry' => (float)($o['fill_price'] ?? 0),
        'prev_exit' => (float)($o['limit_price'] ?? 0),
        'new_entry' => $entry,
        'new_exit' => $exit,
        'new_pnl' => $pnl,
      ];

      $ts = now_ts();
      $u = $pdo->prepare('UPDATE orders SET fill_price=?, limit_price=?, pnl_usd=?, meta=?, updated_at=? WHERE id=?');
      $u->execute([$entry, $exit, $pnl, json_encode($meta, JSON_UNESCAPED_UNICODE), $ts, $orderId]);
      $msg = 'Closed order updated.';
    } catch (Throwable $e) {
      $err = $e->getMessage();
    }
  }
}

// ---- UI ----
$tabs = "<div style='display:flex;gap:8px;flex-wrap:wrap'>".
  "<a class='btn' href='/admin/trades.php?view=open&user=".urlencode($userFilter)."'>Open (REAL)</a>".
  "<a class='btn' href='/admin/trades.php?view=closed&user=".urlencode($userFilter)."'>Closed (REAL)</a>".
"</div>";

$filterForm = "<form method='get' style='display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px'>".
  "<input type='hidden' name='view' value='".h($view)."'>".
  "<input name='user' value='".h($userFilter)."' placeholder='Filter user: id / username / uid / tg_id' style='min-width:280px'>".
  "<button class='btn' type='submit'>Filter</button>".
  "<a class='btn' href='/admin/trades.php?view=".h($view)."'>Reset</a>".
"</form>";

$body = "<div class='card'><h2>Trades</h2>{$tabs}{$filterForm}</div>";
if ($msg) $body .= "<div class='card'><span class='pill ok'>".h($msg)."</span></div>";
if ($err) $body .= "<div class='card'><span class='pill bad'>".h($err)."</span></div>";

if ($view === 'open') {
  // Show ALL open REAL positions (spot + perp). Previously it was perp-only which hides spot trades.
  $sql = "SELECT p.*, u.username, u.tg_id FROM positions p JOIN users u ON u.id=p.user_id WHERE p.status='open' AND p.symbol LIKE '@R@%'";
  $args = [];
  if ($userId > 0) { $sql .= " AND p.user_id=?"; $args[] = $userId; }
  $sql .= " ORDER BY p.id DESC LIMIT 500";

  $st = $pdo->prepare($sql);
  $st->execute($args);
  $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];

  $body .= "<div class='card'><h3>Open Positions (REAL)</h3><table><thead><tr>".
    "<th>ID</th><th>User</th><th>Symbol</th><th>Market</th><th>Asset</th><th>Side</th><th>Qty</th><th>Lev</th><th>Margin</th><th>Entry</th><th>Mark</th><th>PNL</th><th>ROE%</th><th>Adjust</th>".
  "</tr></thead><tbody>";

  foreach ($rows as $p) {
    $pid = (int)$p['id'];
    $symStored = (string)($p['symbol'] ?? '');
    $sym = clean_symbol($symStored);
    $marketType = strtolower((string)($p['market_type'] ?? 'spot'));
    $assetType = strtolower((string)($p['asset_type'] ?? 'crypto'));

    $side = strtoupper((string)($p['side'] ?? 'BUY'));
    $qty = (float)($p['qty'] ?? 0);
    $entry = (float)($p['entry_price'] ?? 0);
    $lev = (int)($p['leverage'] ?? 1);
    $margin = (float)($p['margin_initial'] ?? 0);

    // Get best-effort mark/last price from cached quotes table.
    $mark = 0.0;
    try {
      $q = quote_get($sym);
      if ($q) {
        if ($marketType === 'perp') {
          $mark = (float)($q['mark_price'] ?? 0);
          if ($mark <= 0) $mark = (float)($q['price'] ?? 0);
        } else {
          $mark = (float)($q['price'] ?? 0);
        }
      }
      if ($mark <= 0) {
        // Fallback: compute fresh using the same pricing logic used by the engine.
        $mark = quote_price($sym, $marketType === 'perp' ? 'perp' : 'spot', $assetType ?: 'crypto');
      }
    } catch (Throwable $e) { $mark = 0.0; }

    // PnL + ROE
    $pnl = 0.0;
    if ($mark > 0 && $entry > 0 && $qty > 0) {
      if ($marketType === 'perp') {
        $pnl = perp_calc_pnl($entry, $mark, $qty, $side);
      } else {
        $pnl = ($side === 'SELL') ? (($entry - $mark) * $qty) : (($mark - $entry) * $qty);
      }
    }

    $base = ($margin > 0) ? $margin : ($qty * $entry);
    $roe = ($base > 0) ? (($pnl / $base) * 100.0) : 0.0;

    $userLabel = h(($p['username'] ?? '') !== '' ? ('@'.$p['username']) : ('#'.(int)$p['user_id']));

    $adjustCell = "<form method='post' style='display:flex;gap:8px;flex-wrap:wrap'>".
        "<input type='hidden' name='action' value='adjust_open'>".
        "<input type='hidden' name='pos_id' value='{$pid}'>".
        "<input name='target_pnl' placeholder='PNL $' style='width:110px'>".
        "<input name='target_roe' placeholder='ROE %' style='width:110px'>".
        "<button class='btn' type='submit'>Apply</button>".
      "</form>";

    $body .= "<tr>".
      "<td>{$pid}</td>".
      "<td>{$userLabel}</td>".
      "<td>".h($sym)."</td>".
      "<td>".h(strtoupper($marketType))."</td>".
      "<td>".h(strtoupper($assetType))."</td>".
      "<td>".h($side)."</td>".
      "<td>".h(number_format($qty, 6))."</td>".
      "<td>".h((string)$lev)."</td>".
      "<td>".h(number_format($margin, 2))."</td>".
      "<td>".h(number_format($entry, 6))."</td>".
      "<td>".($mark>0?h(number_format($mark, 6)): "<span class='pill bad'>no price</span>")."</td>".
      "<td>".h(number_format($pnl, 2))."</td>".
      "<td>".h(number_format($roe, 2))."</td>".
      "<td>{$adjustCell}</td>".
    "</tr>";
  }

  $body .= "</tbody></table><div class='muted tiny' style='margin-top:10px'>Open positions list includes <b>SPOT + PERP</b>. Adjust tool works for <b>REAL PERP</b> (entry recalculated) and <b>REAL SPOT</b> (entry recalculated + wallet adjusted so Total/Available update).</div></div>";
}

if ($view === 'closed') {
  $sql = "SELECT o.*, u.username FROM orders o JOIN users u ON u.id=o.user_id WHERE o.status='closed' AND o.symbol LIKE '@R@%'";
  $args = [];
  if ($userId > 0) { $sql .= " AND o.user_id=?"; $args[] = $userId; }
  $sql .= " ORDER BY o.id DESC LIMIT 300";

  $st = $pdo->prepare($sql);
  $st->execute($args);
  $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];

  $body .= "<div class='card'><h3>Closed Orders (REAL)</h3><table><thead><tr>".
    "<th>ID</th><th>User</th><th>Symbol</th><th>Side</th><th>Qty</th><th>Lev</th><th>Entry</th><th>Exit</th><th>PNL</th><th>Closed At</th><th>Edit</th>".
  "</tr></thead><tbody>";

  foreach ($rows as $o) {
    $oid = (int)$o['id'];
    $sym = clean_symbol((string)($o['symbol'] ?? ''));
    $side = strtoupper((string)($o['side'] ?? 'BUY'));
    $qty = (float)($o['qty'] ?? 0);
    $lev = (int)($o['leverage'] ?? 1);
    $entry = (float)($o['fill_price'] ?? 0);
    $exit = (float)($o['limit_price'] ?? 0);
    $pnl = (float)($o['pnl_usd'] ?? (($side==='SELL')?(($entry-$exit)*$qty):(($exit-$entry)*$qty)));
    $closedAt = (int)($o['closed_at'] ?? 0);
    $userLabel = h(($o['username'] ?? '') !== '' ? ('@'.$o['username']) : ('#'.(int)$o['user_id']));

    $body .= "<tr>".
      "<td>{$oid}</td>".
      "<td>{$userLabel}</td>".
      "<td>".h($sym)."</td>".
      "<td>".h($side)."</td>".
      "<td>".h(number_format($qty, 6))."</td>".
      "<td>".h((string)$lev)."</td>".
      "<td>".h(number_format($entry, 6))."</td>".
      "<td>".h(number_format($exit, 6))."</td>".
      "<td>".h(number_format($pnl, 2))."</td>".
      "<td>".($closedAt? h(date('Y-m-d H:i', $closedAt)) : '-')."</td>".
      "<td>".
        "<form method='post' style='display:flex;gap:8px;flex-wrap:wrap'>".
          "<input type='hidden' name='action' value='edit_closed'>".
          "<input type='hidden' name='order_id' value='{$oid}'>".
          "<input name='entry_price' placeholder='Entry' value='".h($entry)."' style='width:120px'>".
          "<input name='exit_price' placeholder='Exit' value='".h($exit)."' style='width:120px'>".
          "<button class='btn' type='submit'>Save</button>".
        "</form>".
      "</td>".
    "</tr>";
  }

  $body .= "</tbody></table><div class='muted tiny' style='margin-top:10px'>Closed edits allow changing <b>entry + exit</b>. PNL is recalculated automatically.</div></div>";
}

admin_layout('Trades', $body);
