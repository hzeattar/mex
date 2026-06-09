<?php
// Avalon Admin Panel - إدارة نظام Avalon
session_start();
require_once __DIR__ . '/../api/lib/common.php';

// التحقق من صلاحيات الأدمن
$uid = $_SESSION['user_id'] ?? 0;
if (!$uid || !is_admin($uid)) {
  header('HTTP/1.1 403 Forbidden');
  exit('Access Denied');
}

$pdo = db();
$action = $_GET['action'] ?? 'dashboard';

// معالجة الإجراءات
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  switch ($action) {
    case 'create_trader':
      $st = $pdo->prepare("INSERT INTO avalon_traders 
        (trader_code, display_name, strategy, risk_level, 
         win_rate, total_return, monthly_return, followers_count,
         min_copy_amount, max_copy_amount, leverage_max,
         is_active, is_featured, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)");
      $st->execute([
        $_POST['trader_code'],
        $_POST['display_name'],
        $_POST['strategy'],
        $_POST['risk_level'],
        $_POST['win_rate'],
        $_POST['total_return'],
        $_POST['monthly_return'],
        $_POST['followers_count'] ?? 0,
        $_POST['min_copy_amount'],
        $_POST['max_copy_amount'],
        $_POST['leverage_max'],
        $_POST['is_featured'] ?? 0,
        $uid
      ]);
      header('Location: ?action=traders');
      exit;
      
    case 'create_signal':
      $st = $pdo->prepare("INSERT INTO avalon_signals 
        (trader_id, symbol, side, entry_price, target_price, stop_loss,
         size, leverage, confidence, opened_at, expires_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? HOUR), ?)");
      $st->execute([
        $_POST['trader_id'],
        $_POST['symbol'],
        $_POST['side'],
        $_POST['entry_price'],
        $_POST['target_price'],
        $_POST['stop_loss'],
        $_POST['size'],
        $_POST['leverage'],
        $_POST['confidence'],
        $_POST['duration_hours'] ?? 24,
        $uid
      ]);
      header('Location: ?action=signals');
      exit;
      
    case 'close_signal':
      $pdo->prepare("UPDATE avalon_signals 
                      SET status = 'closed', closed_at = NOW(), 
                          close_reason = ?, current_price = ?
                      WHERE id = ?")->execute([
        $_POST['close_reason'],
        $_POST['exit_price'],
        $_POST['signal_id']
      ]);
      header('Location: ?action=signals');
      exit;
  }
}

// جلب البيانات
$traders = $pdo->query("SELECT * FROM avalon_traders ORDER BY is_featured DESC, followers_count DESC")->fetchAll();
$signals = $pdo->query("SELECT s.*, t.display_name as trader_name 
                         FROM avalon_signals s 
                         JOIN avalon_traders t ON s.trader_id = t.id 
                         ORDER BY s.opened_at DESC")->fetchAll();
$stats = $pdo->query("SELECT 
  (SELECT COUNT(*) FROM avalon_traders WHERE is_active = 1) as active_traders,
  (SELECT COUNT(*) FROM avalon_signals WHERE status = 'active') as active_signals,
  (SELECT COUNT(*) FROM avalon_copy_relations WHERE is_active = 1) as total_copies,
  (SELECT SUM(amount) FROM avalon_copy_relations WHERE is_active = 1) as total_copy_volume
")->fetch(PDO::FETCH_ASSOC);
?>
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Avalon Admin - نظام نسخ الصفقات</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #0a0e1a; color: #fff; }
    .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
    header { background: #1a1f2e; padding: 20px; border-radius: 12px; margin-bottom: 20px; }
    header h1 { color: #00d4ff; font-size: 28px; }
    header p { color: #8b92a8; margin-top: 5px; }
    
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
    .stat-card { background: #1a1f2e; padding: 20px; border-radius: 12px; text-align: center; }
    .stat-card h3 { color: #8b92a8; font-size: 14px; margin-bottom: 10px; }
    .stat-card .value { color: #00d4ff; font-size: 32px; font-weight: bold; }
    
    .nav { display: flex; gap: 10px; margin-bottom: 20px; }
    .nav a { padding: 12px 24px; background: #252b3d; color: #fff; text-decoration: none; 
             border-radius: 8px; transition: all 0.3s; }
    .nav a:hover, .nav a.active { background: #00d4ff; color: #0a0e1a; }
    
    .section { background: #1a1f2e; padding: 20px; border-radius: 12px; margin-bottom: 20px; }
    .section h2 { color: #00d4ff; margin-bottom: 20px; font-size: 20px; }
    
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: right; border-bottom: 1px solid #252b3d; }
    th { color: #8b92a8; font-weight: 600; }
    tr:hover { background: #252b3d; }
    
    .btn { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; 
           font-size: 14px; transition: all 0.3s; }
    .btn-primary { background: #00d4ff; color: #0a0e1a; }
    .btn-success { background: #00ff88; color: #0a0e1a; }
    .btn-danger { background: #ff4757; color: #fff; }
    .btn:hover { opacity: 0.8; }
    
    .form-group { margin-bottom: 15px; }
    .form-group label { display: block; color: #8b92a8; margin-bottom: 5px; }
    .form-group input, .form-group select, .form-group textarea {
      width: 100%; padding: 10px; background: #252b3d; border: 1px solid #3a4055;
      border-radius: 6px; color: #fff; font-size: 14px;
    }
    .form-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
    
    .badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; }
    .badge-success { background: #00ff88; color: #0a0e1a; }
    .badge-warning { background: #ffa502; color: #0a0e1a; }
    .badge-danger { background: #ff4757; color: #fff; }
    
    .trader-avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
    
    .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
             background: rgba(0,0,0,0.8); z-index: 1000; justify-content: center; align-items: center; }
    .modal.active { display: flex; }
    .modal-content { background: #1a1f2e; padding: 30px; border-radius: 12px; width: 90%; max-width: 600px; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .modal-header h3 { color: #00d4ff; }
    .close-modal { background: none; border: none; color: #8b92a8; font-size: 24px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🎯 Avalon Admin</h1>
      <p>نظام إدارة نسخ الصفقات والمتداولين</p>
    </header>
    
    <!-- إحصائيات -->
    <div class="stats">
      <div class="stat-card">
        <h3>المتداولون النشطون</h3>
        <div class="value"><?= $stats['active_traders'] ?? 0 ?></div>
      </div>
      <div class="stat-card">
        <h3>الإشارات النشطة</h3>
        <div class="value"><?= $stats['active_signals'] ?? 0 ?></div>
      </div>
      <div class="stat-card">
        <h3>إجمالي النسخ</h3>
        <div class="value"><?= number_format($stats['total_copies'] ?? 0) ?></div>
      </div>
      <div class="stat-card">
        <h3>حجم النسخ (USDT)</h3>
        <div class="value"><?= number_format($stats['total_copy_volume'] ?? 0) ?></div>
      </div>
    </div>
    
    <!-- التنقل -->
    <div class="nav">
      <a href="?action=dashboard" class="<?= $action === 'dashboard' ? 'active' : '' ?>">الرئيسية</a>
      <a href="?action=traders" class="<?= $action === 'traders' ? 'active' : '' ?>">المتداولون</a>
      <a href="?action=signals" class="<?= $action === 'signals' ? 'active' : '' ?>">الإشارات</a>
      <a href="?action=copies" class="<?= $action === 'copies' ? 'active' : '' ?>">النسخ</a>
    </div>
    
    <?php if ($action === 'traders'): ?>
    <!-- قسم المتداولين -->
    <div class="section">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2>📊 قائمة المتداولين</h2>
        <button class="btn btn-primary" onclick="document.getElementById('addTraderModal').classList.add('active')">
          + إضافة متداول
        </button>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>المتداول</th>
            <th>الاستراتيجية</th>
            <th>نسبة النجاح</th>
            <th>العائد</th>
            <th>المتابعين</th>
            <th>الحدود</th>
            <th>الحالة</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($traders as $trader): ?>
          <tr>
            <td>
              <div style="display: flex; align-items: center; gap: 10px;">
                <img src="<?= htmlspecialchars($trader['avatar_url']) ?>" class="trader-avatar" alt="">
                <div>
                  <div><?= htmlspecialchars($trader['display_name']) ?></div>
                  <small style="color: #8b92a8;"><?= htmlspecialchars($trader['trader_code']) ?></small>
                </div>
              </div>
            </td>
            <td><?= htmlspecialchars($trader['strategy']) ?></td>
            <td><?= $trader['win_rate'] ?>%</td>
            <td><?= $trader['total_return'] ?>%</td>
            <td><?= number_format($trader['followers_count']) ?></td>
            <td>$<?= $trader['min_copy_amount'] ?> - $<?= $trader['max_copy_amount'] ?></td>
            <td>
              <?php if ($trader['is_active']): ?>
                <span class="badge badge-success">نشط</span>
              <?php else: ?>
                <span class="badge badge-danger">معطل</span>
              <?php endif; ?>
              <?php if ($trader['is_featured']): ?>
                <span class="badge badge-warning">مميز</span>
              <?php endif; ?>
            </td>
            <td>
              <a href="?action=edit_trader&id=<?= $trader['id'] ?>" class="btn btn-primary">تعديل</a>
            </td>
          </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
    
    <!-- نموذج إضافة متداول -->
    <div class="modal" id="addTraderModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>إضافة متداول جديد</h3>
          <button class="close-modal" onclick="document.getElementById('addTraderModal').classList.remove('active')">&times;</button>
        </div>
        
        <form method="POST" action="?action=create_trader">
          <div class="form-row">
            <div class="form-group">
              <label>كود المتداول</label>
              <input type="text" name="trader_code" placeholder="AVA_009" required>
            </div>
            <div class="form-group">
              <label>الاسم الظاهر</label>
              <input type="text" name="display_name" placeholder="Alpha Trader" required>
            </div>
            <div class="form-group">
              <label>الاستراتيجية</label>
              <select name="strategy">
                <option value="scalping">Scalping</option>
                <option value="swing">Swing</option>
                <option value="trend">Trend</option>
                <option value="grid">Grid</option>
                <option value="breakout">Breakout</option>
                <option value="arbitrage">Arbitrage</option>
              </select>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>نسبة النجاح %</label>
              <input type="number" name="win_rate" step="0.01" value="70" required>
            </div>
            <div class="form-group">
              <label>إجمالي العائد %</label>
              <input type="number" name="total_return" step="0.01" value="150" required>
            </div>
            <div class="form-group">
              <label>العائد الشهري %</label>
              <input type="number" name="monthly_return" step="0.01" value="12" required>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>الحد الأدنى للنسخ</label>
              <input type="number" name="min_copy_amount" value="500" required>
            </div>
            <div class="form-group">
              <label>الحد الأقصى للنسخ</label>
              <input type="number" name="max_copy_amount" value="50000" required>
            </div>
            <div class="form-group">
              <label>أقصى رافعة</label>
              <input type="number" name="leverage_max" value="10" required>
            </div>
          </div>
          
          <div class="form-group">
            <label>مستوى المخاطرة</label>
            <select name="risk_level">
              <option value="low">منخفض</option>
              <option value="medium" selected>متوسط</option>
              <option value="high">عالي</option>
              <option value="very_high">عالي جداً</option>
            </select>
          </div>
          
          <div class="form-group">
            <label><input type="checkbox" name="is_featured" value="1"> مميز</label>
          </div>
          
          <button type="submit" class="btn btn-success">إنشاء المتداول</button>
        </form>
      </div>
    </div>
    
    <?php elseif ($action === 'signals'): ?>
    <!-- قسم الإشارات -->
    <div class="section">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2>📡 الإشارات النشطة</h2>
        <button class="btn btn-primary" onclick="document.getElementById('addSignalModal').classList.add('active')">
          + إضافة إشارة
        </button>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>المتداول</th>
            <th>الزوج</th>
            <th>الاتجاه</th>
            <th>سعر الدخول</th>
            <th>الهدف/الوقف</th>
            <th>الرافعة</th>
            <th>الحالة</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($signals as $signal): ?>
          <tr>
            <td><?= htmlspecialchars($signal['trader_name']) ?></td>
            <td><?= htmlspecialchars($signal['symbol']) ?></td>
            <td>
              <span class="badge <?= $signal['side'] === 'BUY' ? 'badge-success' : 'badge-danger' ?>">
                <?= $signal['side'] ?>
              </span>
            </td>
            <td><?= number_format($signal['entry_price'], 2) ?></td>
            <td>
              TP: <?= number_format($signal['target_price'], 2) ?><br>
              SL: <?= number_format($signal['stop_loss'], 2) ?>
            </td>
            <td><?= $signal['leverage'] ?>x</td>
            <td>
              <?php if ($signal['status'] === 'active'): ?>
                <span class="badge badge-success">نشطة</span>
              <?php else: ?>
                <span class="badge badge-warning">مغلقة</span>
              <?php endif; ?>
            </td>
            <td>
              <?php if ($signal['status'] === 'active'): ?>
              <button class="btn btn-danger" onclick="closeSignal(<?= $signal['id'] ?>)">إغلاق</button>
              <?php endif; ?>
            </td>
          </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
    
    <!-- نموذج إضافة إشارة -->
    <div class="modal" id="addSignalModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>إضافة إشارة جديدة</h3>
          <button class="close-modal" onclick="document.getElementById('addSignalModal').classList.remove('active')">&times;</button>
        </div>
        
        <form method="POST" action="?action=create_signal">
          <div class="form-group">
            <label>المتداول</label>
            <select name="trader_id" required>
              <?php foreach ($traders as $t): ?>
              <option value="<?= $t['id'] ?>"><?= htmlspecialchars($t['display_name']) ?></option>
              <?php endforeach; ?>
            </select>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>الزوج</label>
              <input type="text" name="symbol" placeholder="BTCUSDT" required>
            </div>
            <div class="form-group">
              <label>الاتجاه</label>
              <select name="side">
                <option value="BUY">شراء (BUY)</option>
                <option value="SELL">بيع (SELL)</option>
              </select>
            </div>
            <div class="form-group">
              <label>نوع الأمر</label>
              <select name="type">
                <option value="market">سوقي</option>
                <option value="limit">محدد</option>
                <option value="stop">وقف</option>
              </select>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>سعر الدخول</label>
              <input type="number" name="entry_price" step="0.00000001" required>
            </div>
            <div class="form-group">
              <label>سعر الهدف (TP)</label>
              <input type="number" name="target_price" step="0.00000001" required>
            </div>
            <div class="form-group">
              <label>سعر الوقف (SL)</label>
              <input type="number" name="stop_loss" step="0.00000001" required>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>الحجم</label>
              <input type="number" name="size" step="0.00000001" value="0.1" required>
            </div>
            <div class="form-group">
              <label>الرافعة</label>
              <input type="number" name="leverage" value="10" required>
            </div>
            <div class="form-group">
              <label>نسبة الثقة %</label>
              <input type="number" name="confidence" value="80" min="1" max="100" required>
            </div>
          </div>
          
          <div class="form-group">
            <label>مدة الصلاحية (ساعات)</label>
            <input type="number" name="duration_hours" value="24" required>
          </div>
          
          <button type="submit" class="btn btn-success">إنشاء الإشارة</button>
        </form>
      </div>
    </div>
    
    <script>
      function closeSignal(signalId) {
        if (confirm('هل أنت متأكد من إغلاق هذه الإشارة؟')) {
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = '?action=close_signal';
          form.innerHTML = `
            <input type="hidden" name="signal_id" value="${signalId}">
            <input type="hidden" name="exit_price" value="0">
            <input type="hidden" name="close_reason" value="manual">
          `;
          document.body.appendChild(form);
          form.submit();
        }
      }
    </script>
    <?php endif; ?>
    
  </div>
</body>
</html>
