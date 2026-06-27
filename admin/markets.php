<?php
require_once __DIR__ . '/includes/auth.php';
admin_require();
$pdo = db();
$msg = '';

function h($s){ return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

$types = [
  'crypto' => 'Crypto',
  'forex' => 'Forex',
  'stocks' => 'Stocks',
  'commodities' => 'Commodities',
];

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
  admin_verify_csrf();
  $action = (string)($_POST['action'] ?? '');
  $now = time();

  if ($action === 'save') {
    $id = (int)($_POST['id'] ?? 0);
    $symbol = strtoupper(trim((string)($_POST['symbol'] ?? '')));
    $name = trim((string)($_POST['name'] ?? ''));
    $type = strtolower(trim((string)($_POST['type'] ?? 'crypto')));
    if ($type === 'fx') $type = 'forex';
    $status = (string)($_POST['status'] ?? 'active');
    $sort = (int)($_POST['sort_order'] ?? 0);

    $tv_symbol = trim((string)($_POST['tv_symbol'] ?? ''));
    $seed_price = (float)($_POST['seed_price'] ?? 0);

    
    $polygon_ticker = trim((string)($_POST['polygon_ticker'] ?? ''));
    $stooq_ticker = trim((string)($_POST['stooq_ticker'] ?? ''));

    // meta JSON (extendable)
    $meta = [];
    if ($polygon_ticker !== '') $meta['polygon_ticker'] = $polygon_ticker;
    if ($stooq_ticker !== '') $meta['stooq_ticker'] = $stooq_ticker;
    $meta_json = $meta ? json_encode($meta, JSON_UNESCAPED_UNICODE) : null;
if ($symbol === '' || !preg_match('/^[A-Z0-9:_-]{2,32}$/', $symbol)) {
      $msg = 'Invalid symbol';
    } elseif (!isset($types[$type])) {
      $msg = 'Invalid type';
    } else {
      if ($id > 0) {
        $stmt = $pdo->prepare("UPDATE markets SET symbol=?, name=?, type=?, status=?, sort_order=?, tv_symbol=?, seed_price=?, meta=?, updated_at=? WHERE id=?");
        $stmt->execute([$symbol, $name, $type, $status, $sort, ($tv_symbol!==''?$tv_symbol:null), $seed_price, $meta_json, $now, $id]);
        $msg = 'Updated';
      } else {
        $stmt = $pdo->prepare("INSERT INTO markets(symbol,name,type,status,sort_order,tv_symbol,seed_price,meta,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)");
        $stmt->execute([$symbol, $name, $type, $status, $sort, ($tv_symbol!==''?$tv_symbol:null), $seed_price, $meta_json, $now, $now]);
        $msg = 'Created';
      }
    }
  }

  if ($action === 'toggle') {
    $id = (int)($_POST['id'] ?? 0);
    $cur = (string)($_POST['cur'] ?? 'disabled');
    $next = $cur === 'active' ? 'disabled' : 'active';
    $pdo->prepare("UPDATE markets SET status=?, updated_at=? WHERE id=?")->execute([$next, $now, $id]);
    $msg = 'Toggled';
  }
}

$editId = (int)($_GET['id'] ?? 0);
$edit = ['id'=>0,'symbol'=>'','name'=>'','type'=>'crypto','status'=>'active','sort_order'=>0,'tv_symbol'=>'','seed_price'=>0];
if ($editId > 0) {
  $stmt = $pdo->prepare("SELECT * FROM markets WHERE id=?");
  $stmt->execute([$editId]);
  $row = $stmt->fetch(PDO::FETCH_ASSOC);
  if ($row) $edit = $row;
}

$editMeta = [];
if (!empty($edit['meta'])) {
  $m = json_decode((string)$edit['meta'], true);
  if (is_array($m)) $editMeta = $m;
}

$rows = $pdo->query("SELECT * FROM markets ORDER BY type ASC, sort_order ASC, symbol ASC")->fetchAll(PDO::FETCH_ASSOC);

ob_start();
?>
<div class="card">
  <h2 style="margin:0 0 10px">Markets</h2>
  <p style="margin:0 0 10px;color:#94a3b8">Manage market symbols and categories shown in the Mini App (Crypto / Forex / Stocks / Commodities).</p>
  <?php if($msg): ?>
    <div class="pill ok" style="margin-bottom:10px"><?=h($msg)?></div>
  <?php endif; ?>

  <form method="post" class="grid" style="margin-bottom:12px">
    <input type="hidden" name="action" value="save">
    <input type="hidden" name="id" value="<?=h($edit['id'] ?? 0)?>">
    <div>
      <label>Symbol</label><br>
      <input name="symbol" value="<?=h($edit['symbol'] ?? '')?>" placeholder="BTCUSDT / EURUSD / AAPL" required>
    </div>
    <div>
      <label>Name</label><br>
      <input name="name" value="<?=h($edit['name'] ?? '')?>" placeholder="Bitcoin / USDT">
    </div>
    <div>
      <label>Category</label><br>
      <select name="type">
        <?php foreach($types as $k=>$v): ?>
          <option value="<?=h($k)?>" <?=$k===($edit['type']??'crypto')?'selected':''?>><?=h($v)?></option>
        <?php endforeach; ?>
      </select>
    </div>

    <div>
      <label>TV Symbol</label><br>
      <input name="tv_symbol" value="<?=h($edit['tv_symbol'] ?? '')?>" placeholder="BINANCE:BTCUSDT / FX:EURUSD / NASDAQ:AAPL">
      <div class="muted small" style="margin-top:6px">Used for TradingView widgets in the mini app.</div>
    </div>
    <div>
      <label>Seed Price</label><br>
      <input type="number" step="0.000001" name="seed_price" value="<?=h($edit['seed_price'] ?? 0)?>">
      <div class="muted small" style="margin-top:6px">Fallback when no external price is available.</div>
    </div>
    <div>
      <label>Polygon Ticker (optional)</label><br>
      <input name="polygon_ticker" value="<?=h(($editMeta['polygon_ticker'] ?? ''))?>" placeholder="AAPL / C:EURUSD / C:XAUUSD / USO">
      <div class="muted small" style="margin-top:6px">
        Forex/Metals: <b>C:EURUSD</b>, <b>C:XAUUSD</b>. Unsupported commodities: use proxies like <b>USO</b> (WTI), <b>BNO</b> (Brent), <b>UNG</b> (NatGas), <b>CPER</b> (Copper).
      </div>
    </div>
    <div>
      <label>Stooq Ticker (optional)</label><br>
      <input name="stooq_ticker" value="<?=h(($editMeta['stooq_ticker'] ?? ''))?>" placeholder="aapl.us / uso.us / gld.us">
      <div class="muted small" style="margin-top:6px">
        Free fallback source for stocks/ETFs (CSV). Use lower-case with suffix (<b>.us</b>) for US tickers.
      </div>
    </div>

    <div>
      <label>Status</label><br>
      <select name="status">
        <option value="active" <?=($edit['status']??'active')==='active'?'selected':''?>>active</option>
        <option value="disabled" <?=($edit['status']??'active')==='disabled'?'selected':''?>>disabled</option>
      </select>
    </div>
    <div>
      <label>Sort</label><br>
      <input type="number" name="sort_order" value="<?=h($edit['sort_order'] ?? 0)?>">
    </div>
    <div>
      <button class="btn" type="submit"><?=($editId>0?'Update':'Create')?></button>
      <?php if($editId>0): ?>
        <a class="btn" href="/admin/markets.php" style="margin-left:8px">Cancel</a>
      <?php endif; ?>
    </div>
  </form>
</div>

<div class="card">
  <h3 style="margin:0 0 10px">All Markets</h3>
  <table>
    <thead><tr>
      <th>ID</th><th>Symbol</th><th>Name</th><th>Category</th><th>TV</th><th>Seed</th><th>Status</th><th>Sort</th><th>Actions</th>
    </tr></thead>
    <tbody>
      <?php foreach($rows as $r): ?>
        <tr>
          <td><?=h($r['id'])?></td>
          <td><strong><?=h($r['symbol'])?></strong></td>
          <td><?=h($r['name'])?></td>
          <td><span class="pill"><?=h($r['type'])?></span></td>
          <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis"><?=h($r['tv_symbol'] ?? '')?></td>
          <td><?=h($r['seed_price'] ?? 0)?></td>
          <td><span class="pill <?=$r['status']==='active'?'ok':'bad'?>"><?=h($r['status'])?></span></td>
          <td><?=h($r['sort_order'] ?? 0)?></td>
          <td style="white-space:nowrap">
            <a class="btn" href="/admin/markets.php?id=<?=h($r['id'])?>">Edit</a>
            <form method="post" style="display:inline">
              <input type="hidden" name="action" value="toggle">
              <input type="hidden" name="id" value="<?=h($r['id'])?>">
              <input type="hidden" name="cur" value="<?=h($r['status'])?>">
              <button class="btn danger" type="submit"><?=($r['status']==='active'?'Disable':'Enable')?></button>
            </form>
          </td>
        </tr>
      <?php endforeach; ?>
    </tbody>
  </table>
</div>
<?php
$body = ob_get_clean();
admin_layout('Markets', $body);
