<?php
require_once __DIR__ . '/includes/auth.php';
admin_require();
$pdo = db();
$driver = db_driver();
$msg = '';

function h($s){ return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function signal_direction_pill($direction){
  $dir = strtoupper(trim((string)$direction));
  if (!in_array($dir, ['BUY','SELL','NEUTRAL'], true)) $dir = 'BUY';
  $styles = [
    'BUY' => 'border-color:rgba(24,201,143,.35);background:rgba(24,201,143,.12);color:#18c98f',
    'SELL' => 'border-color:rgba(246,70,93,.38);background:rgba(246,70,93,.12);color:#ff6074',
    'NEUTRAL' => 'border-color:rgba(148,163,184,.35);background:rgba(148,163,184,.12);color:#cbd5e1',
  ];
  return '<span class="pill" style="' . $styles[$dir] . '">' . h($dir) . '</span>';
}

$markets = $pdo->query("SELECT symbol, name, type, status FROM markets WHERE status='active' ORDER BY type ASC, sort_order ASC, symbol ASC")->fetchAll(PDO::FETCH_ASSOC);
try {
  if (schema_table_exists($pdo, 'trading_signals', $driver) && !schema_column_exists($pdo, 'trading_signals', 'recommend_count', $driver)) schema_add_column($pdo, 'trading_signals', "recommend_count INT NOT NULL DEFAULT 0", "recommend_count INTEGER NOT NULL DEFAULT 0", $driver);
  if (schema_table_exists($pdo, 'trading_signals', $driver) && !schema_column_exists($pdo, 'trading_signals', 'comments_count', $driver)) schema_add_column($pdo, 'trading_signals', "comments_count INT NOT NULL DEFAULT 0", "comments_count INTEGER NOT NULL DEFAULT 0", $driver);
} catch (Throwable $e) {}

$filter_symbol = strtoupper(trim((string)($_GET['symbol'] ?? '')));
$filter_type = strtolower(trim((string)($_GET['type'] ?? '')));
$filter_status = strtolower(trim((string)($_GET['status'] ?? '')));

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
  $action = (string)($_POST['action'] ?? '');
  $now = time();
  try {
  admin_verify_csrf();

  if ($action === 'save') {
    $id = (int)($_POST['id'] ?? 0);
    $market_symbol = strtoupper(trim((string)($_POST['market_symbol'] ?? '')));
    $market_type = strtolower(trim((string)($_POST['market_type'] ?? 'crypto')));
    if ($market_type === 'fx') $market_type = 'forex';
    $timeframe = trim((string)($_POST['timeframe'] ?? ''));
    $direction = strtoupper(trim((string)($_POST['direction'] ?? 'BUY')));
    $entry = (string)($_POST['entry_price'] ?? '');
    $sl = (string)($_POST['stop_loss'] ?? '');
    $tp1 = (string)($_POST['take_profit_1'] ?? '');
    $tp2 = (string)($_POST['take_profit_2'] ?? '');
    $conf = (int)($_POST['confidence'] ?? 50);
    $note_en = trim((string)($_POST['note_en'] ?? ''));
    $note_ar = trim((string)($_POST['note_ar'] ?? ''));
    $note_ru = trim((string)($_POST['note_ru'] ?? ''));
    $bot_enabled = (int)($_POST['bot_enabled'] ?? 0) === 1 ? 1 : 0;
    $bot_name_en = trim((string)($_POST['bot_name_en'] ?? ''));
    $bot_name_ar = trim((string)($_POST['bot_name_ar'] ?? ''));
    $bot_name_ru = trim((string)($_POST['bot_name_ru'] ?? ''));
    $bot_brief_en = trim((string)($_POST['bot_brief_en'] ?? ''));
    $bot_brief_ar = trim((string)($_POST['bot_brief_ar'] ?? ''));
    $bot_brief_ru = trim((string)($_POST['bot_brief_ru'] ?? ''));
    $copy_min_amount = max(0, (float)($_POST['copy_min_amount'] ?? 100));
    $copy_lock_days = max(0, (int)($_POST['copy_lock_days'] ?? 7));
    $copy_profit_share_pct = max(0, min(100, (float)($_POST['copy_profit_share_pct'] ?? 0)));
    $copy_leverage = max(1, (int)($_POST['copy_leverage'] ?? 1));
    $show_on_home = (int)($_POST['show_on_home'] ?? 1) === 1 ? 1 : 0;
    $recommend_count = max(0, (int)($_POST['recommend_count'] ?? 0));
    $comments_count = max(0, (int)($_POST['comments_count'] ?? 0));
    $status = strtolower(trim((string)($_POST['status'] ?? 'active')));
    $valid_until = trim((string)($_POST['valid_until'] ?? ''));

    $validUntilTs = null;
    if ($valid_until !== '') {
      $ts = strtotime($valid_until);
      if ($ts !== false) $validUntilTs = $ts;
    }

    if ($market_symbol === '' || !preg_match('/^[A-Z0-9:_\-]{2,32}$/', $market_symbol)) {
      $msg = 'Invalid symbol';
    } elseif (!in_array($direction, ['BUY','SELL','NEUTRAL'], true)) {
      $msg = 'Invalid direction';
    } else {
      $entryF = $entry === '' ? null : (float)$entry;
      $slF = $sl === '' ? null : (float)$sl;
      $tp1F = $tp1 === '' ? null : (float)$tp1;
      $tp2F = $tp2 === '' ? null : (float)$tp2;

      if ($id > 0) {
        $stmt = $pdo->prepare("UPDATE trading_signals SET market_symbol=?, market_type=?, timeframe=?, direction=?, entry_price=?, stop_loss=?, take_profit_1=?, take_profit_2=?, confidence=?, note_en=?, note_ar=?, note_ru=?, bot_enabled=?, bot_name_en=?, bot_name_ar=?, bot_name_ru=?, bot_brief_en=?, bot_brief_ar=?, bot_brief_ru=?, copy_min_amount=?, copy_lock_days=?, copy_profit_share_pct=?, copy_leverage=?, show_on_home=?, recommend_count=?, comments_count=?, status=?, valid_until=?, updated_at=? WHERE id=?");
        $stmt->execute([$market_symbol,$market_type,$timeframe?:null,$direction,$entryF,$slF,$tp1F,$tp2F,$conf,$note_en?:null,$note_ar?:null,$note_ru?:null,$bot_enabled,$bot_name_en?:null,$bot_name_ar?:null,$bot_name_ru?:null,$bot_brief_en?:null,$bot_brief_ar?:null,$bot_brief_ru?:null,$copy_min_amount,$copy_lock_days,$copy_profit_share_pct,$copy_leverage,$show_on_home,$recommend_count,$comments_count,$status,$validUntilTs,$now,$id]);
        $msg = 'Updated';
      } else {
        $stmt = $pdo->prepare("INSERT INTO trading_signals(market_symbol,market_type,timeframe,direction,entry_price,stop_loss,take_profit_1,take_profit_2,confidence,note_en,note_ar,note_ru,bot_enabled,bot_name_en,bot_name_ar,bot_name_ru,bot_brief_en,bot_brief_ar,bot_brief_ru,copy_min_amount,copy_lock_days,copy_profit_share_pct,copy_leverage,show_on_home,recommend_count,comments_count,status,valid_until,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
        $stmt->execute([$market_symbol,$market_type,$timeframe?:null,$direction,$entryF,$slF,$tp1F,$tp2F,$conf,$note_en?:null,$note_ar?:null,$note_ru?:null,$bot_enabled,$bot_name_en?:null,$bot_name_ar?:null,$bot_name_ru?:null,$bot_brief_en?:null,$bot_brief_ar?:null,$bot_brief_ru?:null,$copy_min_amount,$copy_lock_days,$copy_profit_share_pct,$copy_leverage,$show_on_home,$recommend_count,$comments_count,$status,$validUntilTs,null,$now,$now]);
        $msg = 'Created';
      }
    }
  }

  if ($action === 'toggle') {
    $id = (int)($_POST['id'] ?? 0);
    $cur = (string)($_POST['cur'] ?? 'disabled');
    $next = $cur === 'active' ? 'disabled' : 'active';
    $pdo->prepare("UPDATE trading_signals SET status=?, updated_at=? WHERE id=?")->execute([$next, $now, $id]);
    $msg = 'Toggled';
  }
  } catch (Throwable $e) {
    $msg = 'Signal desk error: ' . $e->getMessage();
  }
}

$editId = (int)($_GET['id'] ?? 0);
$edit = [
  'id'=>0,'market_symbol'=>'','market_type'=>'crypto','timeframe'=>'','direction'=>'BUY','entry_price'=>'','stop_loss'=>'','take_profit_1'=>'','take_profit_2'=>'','confidence'=>50,
  'note_en'=>'','note_ar'=>'','note_ru'=>'','bot_enabled'=>1,'bot_name_en'=>'','bot_name_ar'=>'','bot_name_ru'=>'','bot_brief_en'=>'','bot_brief_ar'=>'','bot_brief_ru'=>'',
  'copy_min_amount'=>100,'copy_lock_days'=>7,'copy_profit_share_pct'=>0,'copy_leverage'=>1,'show_on_home'=>1,'recommend_count'=>0,'comments_count'=>0,'status'=>'active','valid_until'=>''
];
if ($editId > 0) {
  $stmt = $pdo->prepare("SELECT * FROM trading_signals WHERE id=?");
  $stmt->execute([$editId]);
  $row = $stmt->fetch(PDO::FETCH_ASSOC);
  if ($row) {
    $edit = array_merge($edit, $row);
    if (!empty($row['valid_until'])) $edit['valid_until'] = date('Y-m-d H:i:s', (int)$row['valid_until']);
  }
}

$where = [];
$args = [];
if ($filter_symbol !== '') { $where[] = "s.market_symbol=?"; $args[] = $filter_symbol; }
if ($filter_type !== '' && $filter_type !== 'all') { $where[] = "s.market_type=?"; $args[] = ($filter_type==='fx'?'forex':$filter_type); }
if ($filter_status !== '' && $filter_status !== 'all') { $where[] = "s.status=?"; $args[] = $filter_status; }
$sql = "SELECT s.*, COALESCE(sb.subscribers,0) AS subscribers
        FROM trading_signals s
        LEFT JOIN (
          SELECT signal_id, COUNT(*) AS subscribers
          FROM trading_bot_subscriptions
          WHERE status IN ('active','armed','copied')
          GROUP BY signal_id
        ) sb ON sb.signal_id = s.id";
if ($where) $sql .= " WHERE " . implode(" AND ", $where);
$sql .= " ORDER BY s.id DESC LIMIT 200";
$stmt = $pdo->prepare($sql);
$stmt->execute($args);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

ob_start();
?>
<div class="card">
  <h2 style="margin:0 0 10px">Avalon AI Bots / Copy Desk</h2>
  <p style="margin:0 0 10px;color:#94a3b8">Create one Avalon bot per market, define its direction, entry, SL, TP, leverage, and copy rules. Client subscriptions appear as copy baskets and their copied trades stay linked to the bot history.</p>
  <?php if($msg): ?>
    <div class="pill ok" style="margin-bottom:10px"><?=h($msg)?></div>
  <?php endif; ?>

  <?php
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $base = $scheme . '://' . $host;
    $sec = (string)env('SIGNAL_WEBHOOK_SECRET','');
    $hookUrl = $base . '/api/webhooks/signals/tradingview.php?secret=' . urlencode($sec);
  ?>
  <div class="card" style="background:#0b1a33;border:1px dashed #334155">
    <div class="row" style="justify-content:space-between;align-items:center">
      <div>
        <div style="font-weight:700;margin-bottom:4px">TradingView Webhook</div>
        <div style="color:#94a3b8;font-size:13px">Use this URL in TradingView alert → Webhook URL to publish directly into the platform signal desk.</div>
      </div>
    </div>
    <div style="margin-top:10px">
      <div class="pill" style="display:block;white-space:normal;word-break:break-all"><?=h($hookUrl)?></div>
    </div>
  </div>

  <div class="card" style="margin-top:12px;background:#0a1426;border:1px solid #223150">
    <div style="font-weight:700;margin-bottom:8px">TradingView — quick setup</div>
    <div style="color:#94a3b8;font-size:13px;line-height:1.7">
      1) In TradingView, enable 2FA once.<br>
      2) Open any chart you want signals from.<br>
      3) Press <strong>Create Alert</strong>.<br>
      4) Enable <strong>Webhook URL</strong> and paste the URL above.<br>
      5) Paste the JSON below in the message box, then only change <strong>type</strong> and <strong>direction</strong> when needed.<br>
      6) Save the alert. Every trigger will appear automatically inside this Signals desk.
    </div>
    <div style="margin-top:10px">
      <label style="display:block;margin-bottom:6px;color:#cbd5e1">Sample webhook message</label>
      <textarea readonly rows="10" style="width:100%;font-family:ui-monospace, SFMono-Regular, Menlo, monospace">{
  "symbol": "{{ticker}}",
  "type": "stocks",
  "timeframe": "{{interval}}",
  "direction": "BUY",
  "entry": "{{close}}",
  "sl": "",
  "tp": "",
  "tp2": "",
  "confidence": 70,
  "note_ar": "إشارة تلقائية من TradingView"
}</textarea>
    </div>
    <div style="margin-top:8px;color:#94a3b8;font-size:12px">Allowed types: crypto / forex / stocks / commodities — use <strong>stocks</strong> for Arab stocks too.</div>
  </div>

  <form method="post" style="margin-top:12px">
    <?=admin_csrf_input()?>
    <input type="hidden" name="action" value="save">
    <input type="hidden" name="id" value="<?=h($edit['id'] ?? 0)?>">

    <div class="grid" style="grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px">
      <div>
        <label>Market</label><br>
        <select name="market_symbol" required>
          <option value="">-- choose --</option>
          <?php foreach($markets as $m): $sym = $m['symbol']; ?>
            <option value="<?=h($sym)?>" <?=$sym===($edit['market_symbol']??'')?'selected':''?>>
              <?=h($sym)?><?=($m['name']? ' — '.$m['name'] : '')?> (<?=h($m['type'])?>)
            </option>
          <?php endforeach; ?>
        </select>
      </div>
      <div>
        <label>Category</label><br>
        <select name="market_type">
          <?php foreach(['crypto','forex','stocks','commodities','indices','futures','arab'] as $t): ?>
            <option value="<?=h($t)?>" <?=$t===($edit['market_type']??'crypto')?'selected':''?>><?=h($t)?></option>
          <?php endforeach; ?>
        </select>
      </div>
      <div>
        <label>Timeframe</label><br>
        <input name="timeframe" value="<?=h($edit['timeframe'] ?? '')?>" placeholder="15m / 1H / 4H / 1D">
      </div>
      <div>
        <label>Direction</label><br>
        <select name="direction">
          <option value="BUY" <?=strtoupper($edit['direction']??'BUY')==='BUY'?'selected':''?>>BUY</option>
          <option value="SELL" <?=strtoupper($edit['direction']??'BUY')==='SELL'?'selected':''?>>SELL</option>
          <option value="NEUTRAL" <?=strtoupper($edit['direction']??'BUY')==='NEUTRAL'?'selected':''?>>NEUTRAL / watch only</option>
        </select>
      </div>
    </div>

    <div class="grid" style="grid-template-columns:repeat(5,minmax(0,1fr)); gap:12px; margin-top:12px">
      <div><label>Entry</label><br><input name="entry_price" value="<?=h($edit['entry_price'] ?? '')?>" placeholder="optional"></div>
      <div><label>SL</label><br><input name="stop_loss" value="<?=h($edit['stop_loss'] ?? '')?>" placeholder="optional"></div>
      <div><label>TP1</label><br><input name="take_profit_1" value="<?=h($edit['take_profit_1'] ?? '')?>" placeholder="optional"></div>
      <div><label>TP2</label><br><input name="take_profit_2" value="<?=h($edit['take_profit_2'] ?? '')?>" placeholder="optional"></div>
      <div><label>Confidence</label><br><input type="number" name="confidence" min="1" max="100" value="<?=h($edit['confidence'] ?? 50)?>"></div>
    </div>

    <div class="grid" style="grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-top:12px">
      <div><label>Note (EN)</label><br><textarea name="note_en" rows="3"><?=h($edit['note_en'] ?? '')?></textarea></div>
      <div><label>Note (AR)</label><br><textarea name="note_ar" rows="3"><?=h($edit['note_ar'] ?? '')?></textarea></div>
      <div><label>Note (RU)</label><br><textarea name="note_ru" rows="3"><?=h($edit['note_ru'] ?? '')?></textarea></div>
    </div>

    <div class="card" style="margin-top:12px;background:#0b1a33;border:1px solid #1f2937">
      <div style="font-weight:700;margin-bottom:8px">Avalon AI bot exposure</div>
      <div style="color:#94a3b8;font-size:12px;margin-bottom:10px">If the bot title is empty, the client app will show an automatic name such as <strong>Avalon BTC AI Bot</strong>. Use the brief fields to describe the bot strategy for clients.</div>
      <div class="grid" style="grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; align-items:end">
        <div>
          <label>Enable Avalon bot</label><br>
          <select name="bot_enabled">
            <option value="0" <?=(int)($edit['bot_enabled'] ?? 0)!==1?'selected':''?>>No</option>
            <option value="1" <?=(int)($edit['bot_enabled'] ?? 0)===1?'selected':''?>>Yes</option>
          </select>
        </div>
        <div><label>Min copy amount</label><br><input type="number" step="0.01" min="0" name="copy_min_amount" value="<?=h($edit['copy_min_amount'] ?? 100)?>"></div>
        <div><label>Reserve / lock days</label><br><input type="number" min="0" name="copy_lock_days" value="<?=h($edit['copy_lock_days'] ?? 7)?>"></div>
        <div><label>Profit share %</label><br><input type="number" step="0.01" min="0" max="100" name="copy_profit_share_pct" value="<?=h($edit['copy_profit_share_pct'] ?? 0)?>"></div>
      </div>
      <div class="grid" style="grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; align-items:end; margin-top:12px">
        <div><label>Copy leverage</label><br><input type="number" min="1" name="copy_leverage" value="<?=h($edit['copy_leverage'] ?? 1)?>"></div>
        <div>
          <label>Show on dashboard</label><br>
          <select name="show_on_home">
            <option value="1" <?=(int)($edit['show_on_home'] ?? 1)===1?'selected':''?>>Yes</option>
            <option value="0" <?=(int)($edit['show_on_home'] ?? 1)!==1?'selected':''?>>No</option>
          </select>
        </div>
        <div><label>Recommend count</label><br><input type="number" min="0" name="recommend_count" value="<?=h($edit['recommend_count'] ?? 0)?>"></div>
        <div><label>Comments count</label><br><input type="number" min="0" name="comments_count" value="<?=h($edit['comments_count'] ?? 0)?>"></div>
      </div>
      <div class="grid" style="grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-top:12px">
        <div><label>Bot title (EN)</label><br><input name="bot_name_en" value="<?=h($edit['bot_name_en'] ?? '')?>" placeholder="Avalon BTC AI Bot"></div>
        <div><label>Bot title (AR)</label><br><input name="bot_name_ar" value="<?=h($edit['bot_name_ar'] ?? '')?>" placeholder="بوت Avalon للبيتكوين"></div>
        <div><label>Bot title (RU)</label><br><input name="bot_name_ru" value="<?=h($edit['bot_name_ru'] ?? '')?>" placeholder="Avalon BTC AI Bot"></div>
      </div>
      <div class="grid" style="grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-top:12px">
        <div><label>Bot brief (EN)</label><br><textarea name="bot_brief_en" rows="3"><?=h($edit['bot_brief_en'] ?? '')?></textarea></div>
        <div><label>Bot brief (AR)</label><br><textarea name="bot_brief_ar" rows="3"><?=h($edit['bot_brief_ar'] ?? '')?></textarea></div>
        <div><label>Bot brief (RU)</label><br><textarea name="bot_brief_ru" rows="3"><?=h($edit['bot_brief_ru'] ?? '')?></textarea></div>
      </div>
      <div style="color:#94a3b8;font-size:12px;margin-top:8px">Client copy uses this bot's entry / SL / TP values. Positive profit share is charged only when copied positions close in profit. Use the Recent Signals table to edit each bot like a normal trade setup.</div>
    </div>

    <div class="grid" style="grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin-top:12px; align-items:end">
      <div>
        <label>Status</label><br>
        <select name="status">
          <option value="active" <?=($edit['status']??'active')==='active'?'selected':''?>>active</option>
          <option value="disabled" <?=($edit['status']??'active')==='disabled'?'selected':''?>>disabled</option>
        </select>
      </div>
      <div>
        <label>Valid until</label><br>
        <input name="valid_until" value="<?=h($edit['valid_until'] ?? '')?>" placeholder="YYYY-mm-dd HH:ii:ss (optional)">
      </div>
      <div>
        <button class="btn" type="submit"><?=($editId>0?'Update':'Create')?></button>
        <?php if($editId>0): ?>
          <a class="btn" href="/admin/signals.php" style="margin-left:8px">Cancel</a>
        <?php endif; ?>
      </div>
      <div style="color:#94a3b8;font-size:12px">Tip: enable <strong>Avalon bot</strong> only for setups that should appear in dashboard/Earn and allow copy actions.</div>
    </div>
  </form>
</div>

<div class="card">
  <h3 style="margin:0 0 10px">Recent Avalon Bots</h3>

  <form method="get" style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:10px">
    <input name="symbol" value="<?=h($filter_symbol)?>" placeholder="Filter symbol (BTCUSDT)">
    <select name="type">
      <option value="all">All categories</option>
      <?php foreach(['crypto','forex','stocks','commodities','indices','futures','arab'] as $t): ?>
        <option value="<?=h($t)?>" <?=$filter_type===$t?'selected':''?>><?=h($t)?></option>
      <?php endforeach; ?>
    </select>
    <select name="status">
      <option value="all">All status</option>
      <option value="active" <?=$filter_status==='active'?'selected':''?>>active</option>
      <option value="disabled" <?=$filter_status==='disabled'?'selected':''?>>disabled</option>
    </select>
    <button class="btn" type="submit">Filter</button>
    <a class="btn" href="/admin/signals.php">Reset</a>
  </form>

  <table>
    <thead><tr>
      <th>ID</th><th>Market</th><th>Cat</th><th>Dir</th><th>Entry</th><th>Trading bot</th><th>Subscribers</th><th>Status</th><th>Valid</th><th>Actions</th>
    </tr></thead>
    <tbody>
      <?php foreach($rows as $r): ?>
        <tr>
          <td><?=h($r['id'])?></td>
          <td><strong><?=h($r['market_symbol'])?></strong><?php if($r['timeframe']): ?> <span class="pill"><?=h($r['timeframe'])?></span><?php endif; ?></td>
          <td><span class="pill"><?=h($r['market_type'])?></span></td>
          <td><?=signal_direction_pill($r['direction'])?></td>
          <td>
            <div><?=h($r['entry_price'])?></div>
            <div class="muted small">SL <?=h($r['stop_loss'])?> • TP1 <?=h($r['take_profit_1'])?></div>
          </td>
          <td>
            <?php if((int)($r['bot_enabled'] ?? 0)===1): ?>
              <div class="pill ok">Enabled</div>
              <div class="muted small" style="margin-top:6px"><?=h($r['bot_name_en'] ?: $r['market_symbol'])?></div>
              <div class="muted small">Min $<?=h($r['copy_min_amount'])?> • Share <?=h($r['copy_profit_share_pct'])?>%</div>
            <?php else: ?>
              <span class="pill">Off</span>
            <?php endif; ?>
          </td>
          <td><?=h($r['subscribers'])?></td>
          <td><span class="pill <?=$r['status']==='active'?'ok':'bad'?>"><?=h($r['status'])?></span></td>
          <td><?=($r['valid_until']? h(date('Y-m-d H:i', (int)$r['valid_until'])) : '-')?></td>
          <td style="white-space:nowrap">
            <a class="btn" href="/admin/signals.php?id=<?=h($r['id'])?>">Edit</a>
            <form method="post" style="display:inline">
              <?=admin_csrf_input()?>
              <input type="hidden" name="action" value="toggle">
              <input type="hidden" name="id" value="<?=h($r['id'])?>">
              <input type="hidden" name="cur" value="<?=h($r['status'])?>">
              <button class="btn danger" type="submit"><?=($r['status']==='active'?'Disable':'Enable')?></button>
            </form>
          </td>
        </tr>
        <?php if($r['note_en'] || $r['note_ar'] || $r['note_ru'] || $r['bot_brief_en'] || $r['bot_brief_ar'] || $r['bot_brief_ru']): ?>
          <tr>
            <td></td>
            <td colspan="9" style="color:#cbd5e1">
              <?php if($r['note_en']): ?><div><strong>EN signal:</strong> <?=h($r['note_en'])?></div><?php endif; ?>
              <?php if($r['note_ar']): ?><div dir="rtl"><strong>AR signal:</strong> <?=h($r['note_ar'])?></div><?php endif; ?>
              <?php if($r['note_ru']): ?><div><strong>RU signal:</strong> <?=h($r['note_ru'])?></div><?php endif; ?>
              <?php if($r['bot_brief_en']): ?><div style="margin-top:6px"><strong>EN bot:</strong> <?=h($r['bot_brief_en'])?></div><?php endif; ?>
              <?php if($r['bot_brief_ar']): ?><div dir="rtl"><strong>AR bot:</strong> <?=h($r['bot_brief_ar'])?></div><?php endif; ?>
              <?php if($r['bot_brief_ru']): ?><div><strong>RU bot:</strong> <?=h($r['bot_brief_ru'])?></div><?php endif; ?>
            </td>
          </tr>
        <?php endif; ?>
      <?php endforeach; ?>
    </tbody>
  </table>
</div>

<?php
$body = ob_get_clean();
admin_layout('Signals', $body);
